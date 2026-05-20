import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMPClient, Payment, PreApproval } from "@/lib/mercadopago"

// Mercado Pago envia webhooks para pagamentos e assinaturas
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    const client = getMPClient()

    // ── Pagamento único (anual) ───────────────────────────────────────────────
    if (type === "payment") {
      const paymentApi = new Payment(client)
      const payment = await paymentApi.get({ id: data.id })

      if (payment.status !== "approved") return NextResponse.json({ ok: true })

      const ref = payment.external_reference // "userId|PLAN|ANNUAL"
      if (!ref) return NextResponse.json({ ok: true })

      const [userId, plan, cycle] = ref.split("|")
      if (!userId || !plan || cycle !== "ANNUAL") return NextResponse.json({ ok: true })

      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

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
            billingCycle: "ANNUAL",
            status: "ACTIVE",
            mpPaymentId: String(payment.id),
            currentPeriodEnd: expiresAt,
          },
          update: {
            plan: plan as "PRO" | "PREMIUM",
            billingCycle: "ANNUAL",
            status: "ACTIVE",
            mpPaymentId: String(payment.id),
            currentPeriodEnd: expiresAt,
          },
        }),
      ])
    }

    // ── Assinatura recorrente (mensal) ────────────────────────────────────────
    if (type === "subscription_preapproval") {
      const preApprovalApi = new PreApproval(client)
      const sub = await preApprovalApi.get({ id: data.id })

      const ref = sub.external_reference // "userId|PLAN|MONTHLY"
      if (!ref) return NextResponse.json({ ok: true })

      const [userId, plan] = ref.split("|")
      if (!userId || !plan) return NextResponse.json({ ok: true })

      const isActive = sub.status === "authorized"

      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { plan: isActive ? (plan as "PRO" | "PREMIUM") : "FREE" },
        }),
        prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan: plan as "PRO" | "PREMIUM",
            billingCycle: "MONTHLY",
            status: isActive ? "ACTIVE" : "CANCELLED",
            mpSubscriptionId: String(sub.id),
            currentPeriodEnd: isActive ? expiresAt : null,
          },
          update: {
            plan: plan as "PRO" | "PREMIUM",
            billingCycle: "MONTHLY",
            status: isActive ? "ACTIVE" : "CANCELLED",
            mpSubscriptionId: String(sub.id),
            currentPeriodEnd: isActive ? expiresAt : null,
          },
        }),
      ])
    }

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
