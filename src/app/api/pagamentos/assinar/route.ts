import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe, STRIPE_PRICES } from "@/lib/stripe"
import { z } from "zod"

const schema = z.object({
  plan: z.enum(["PRO", "PREMIUM"]),
  cycle: z.enum(["MONTHLY", "ANNUAL"]),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const { plan, cycle } = schema.parse(body)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mistica-agenda.vercel.app"
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

    // Criar ou reutilizar customer no Stripe
    let customerId = user.stripeCustomerId ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    const priceId = STRIPE_PRICES[plan][cycle]
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID não configurado para ${plan} ${cycle}. Configure STRIPE_PRICE_${plan}_${cycle} no .env` },
        { status: 500 }
      )
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/assinatura?status=success`,
      cancel_url: `${baseUrl}/dashboard/assinatura?status=cancelled`,
      // Passa plano e ciclo nos metadados para o webhook usar
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
          cycle,
        },
      },
      // Permite cartão de crédito e débito (Pix não disponível no Stripe BR ainda em modo subscription)
      payment_method_types: ["card"],
      locale: "pt-BR",
    })

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "URL de checkout não retornada pelo Stripe" }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl: checkoutSession.url })
  } catch (err) {
    console.error("[pagamentos/assinar]", err)
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
