import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

// Stripe exige o body bruto para validar a assinatura do webhook
export const config = { api: { bodyParser: false } }

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  const reader = req.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function POST(req: NextRequest) {
  const rawBody = await getRawBody(req)
  const sig = req.headers.get("stripe-signature") ?? ""
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET não configurado")
    return NextResponse.json({ error: "Webhook secret não configurado" }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error("[webhook] Assinatura inválida:", err)
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 })
  }

  try {
    switch (event.type) {

      // Checkout concluído → ativa o plano
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== "subscription") break

        const stripeSubId = session.subscription as string
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
        const meta = stripeSub.metadata as { userId: string; plan: string; cycle: string }

        if (!meta.userId || !meta.plan || !meta.cycle) {
          console.error("[webhook] Metadados ausentes na subscription", stripeSubId)
          break
        }

        const periodEnd = new Date((stripeSub as any).current_period_end * 1000)

        await prisma.$transaction([
          prisma.user.update({
            where: { id: meta.userId },
            data: { plan: meta.plan as "PRO" | "PREMIUM" },
          }),
          prisma.subscription.upsert({
            where: { userId: meta.userId },
            create: {
              userId: meta.userId,
              plan: meta.plan as "PRO" | "PREMIUM",
              billingCycle: meta.cycle as "MONTHLY" | "ANNUAL",
              status: "ACTIVE",
              stripeSubscriptionId: stripeSubId,
              currentPeriodEnd: periodEnd,
            },
            update: {
              plan: meta.plan as "PRO" | "PREMIUM",
              billingCycle: meta.cycle as "MONTHLY" | "ANNUAL",
              status: "ACTIVE",
              stripeSubscriptionId: stripeSubId,
              currentPeriodEnd: periodEnd,
              cancelledAt: null,
            },
          }),
        ])
        break
      }

      // Fatura paga (renovação mensal/anual automática) → atualiza período
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId = (invoice as any).subscription as string | null
        if (!stripeSubId) break

        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
        const periodEnd = new Date((stripeSub as any).current_period_end * 1000)

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSubId },
          data: {
            status: "ACTIVE",
            currentPeriodEnd: periodEnd,
            cancelledAt: null,
          },
        })
        break
      }

      // Assinatura cancelada/expirada → rebaixa para FREE
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
        })
        if (!sub) break

        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "CANCELLED", cancelledAt: new Date() },
          }),
          prisma.user.update({
            where: { id: sub.userId },
            data: { plan: "FREE" },
          }),
        ])
        break
      }

      // Pagamento falhou → pode notificar ou ignorar por ora
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        console.warn("[webhook] Pagamento falhou para subscription:", (invoice as any).subscription)
        break
      }

      default:
        // Evento não tratado — retorna 200 para o Stripe não retentar
        break
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[webhook] Erro ao processar evento:", event.type, err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// Stripe valida o endpoint com GET ocasionalmente
export async function GET() {
  return NextResponse.json({ ok: true })
}
