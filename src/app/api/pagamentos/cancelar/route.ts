import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  })

  // Se tiver subscription ativa no Stripe, cancela lá também
  if (subscription?.stripeSubscriptionId && subscription.status === "ACTIVE") {
    try {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
      // O webhook 'customer.subscription.deleted' vai rebaixar o plano automaticamente,
      // mas também fazemos aqui para resposta imediata na UI
    } catch (err) {
      console.error("[cancelar] Erro ao cancelar no Stripe:", err)
      // Prossegue para atualizar localmente mesmo se o Stripe falhar
    }
  }

  // Atualiza localmente para resposta imediata na UI
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId: session.user.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { plan: "FREE" },
    }),
  ])

  return NextResponse.json({ ok: true })
}
