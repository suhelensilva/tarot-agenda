import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMPClient, Payment } from "@/lib/mercadopago"

// Mercado Pago envia webhooks para pagamentos (mensal e anual via Checkout Pro)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    if (type !== "payment") return NextResponse.json({ ok: true })

    const client = getMPClient()
    const paymentApi = new Payment(client)
    const payment = await paymentApi.get({ id: data.id })

    if (payment.status !== "approved") return NextResponse.json({ ok: true })

    const ref = payment.external_reference // "userId|PLAN|MONTHLY" ou "userId|PLAN|ANNUAL"
    if (!ref) return NextResponse.json({ ok: true })

    const [userId, plan, cycle] = ref.split("|")
    if (!userId || !plan || !cycle) return NextResponse.json({ ok: true })

    const isAnnual = cycle === "ANNUAL"
    const expiresAt = new Date()
    if (isAnnual) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { plan: plan as "PRO" | "PREMIUM" },
      }),
      prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan: plan as "PRO" | "PREMIUM",
          billingCycle: isAnnual ? "ANNUAL" : "MONTHLY",
          status: "ACTIVE",
          mpPaymentId: String(payment.id),
          currentPeriodEnd: expiresAt,
        },
        update: {
          plan: plan as "PRO" | "PREMIUM",
          billingCycle: isAnnual ? "ANNUAL" : "MONTHLY",
          status: "ACTIVE",
          mpPaymentId: String(payment.id),
          currentPeriodEnd: expiresAt,
          cancelledAt: null,
        },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[webhook]", err)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}

// MP também faz GET para validar o endpoint
export async function GET() {
  return NextResponse.json({ ok: true })
}
