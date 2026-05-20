import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  // Cancela a assinatura e rebaixa o plano para FREE imediatamente
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
