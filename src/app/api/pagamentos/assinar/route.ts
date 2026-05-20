import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMPClient, PLAN_PRICES, PLAN_NAMES } from "@/lib/mercadopago"
import { Preference } from "mercadopago"
import { z } from "zod"

const schema = z.object({
  plan: z.enum(["PRO", "PREMIUM"]),
  cycle: z.enum(["MONTHLY", "ANNUAL"]),
  paymentMethod: z.enum(["pix", "credit_card"]).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const { plan, cycle, paymentMethod } = schema.parse(body)

    const client = getMPClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mistica-agenda.vercel.app"
    const planName = PLAN_NAMES[plan]
    const amount = PLAN_PRICES[plan][cycle]

    const preference = new Preference(client)

    // Mensal: Pix à vista ou cartão (sem parcelamento)
    // Anual:  Pix à vista ou cartão em até 12x
    const isMonthly = cycle === "MONTHLY"
    const cycleLabel = isMonthly ? "Mensal" : "Anual"
    const installments = isMonthly ? 1 : (paymentMethod === "credit_card" ? 12 : 1)

    const excludedTypes = paymentMethod === "pix"
      ? [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }]
      : [{ id: "ticket" }]

    const result = await preference.create({
      body: {
        items: [{
          id: `${plan}_${cycle}`,
          title: `Mística Agenda — Plano ${planName} ${cycleLabel}`,
          quantity: 1,
          unit_price: amount,
          currency_id: "BRL",
        }],
        payment_methods: {
          excluded_payment_types: excludedTypes,
          installments,
        },
        back_urls: {
          success: `${baseUrl}/dashboard/assinatura?status=success&plan=${plan}&cycle=${cycle.toLowerCase()}`,
          failure: `${baseUrl}/dashboard/assinatura?status=failure`,
          pending: `${baseUrl}/dashboard/assinatura?status=pending`,
        },
        auto_return: "approved",
        external_reference: `${session.user.id}|${plan}|${cycle}`,
        notification_url: `${baseUrl}/api/pagamentos/webhook`,
      },
    })

    const checkoutUrl = result.init_point
    if (!checkoutUrl) {
      console.error("[pagamentos/assinar] init_point ausente", JSON.stringify(result, null, 2))
      return NextResponse.json({ error: "URL de checkout não retornada pelo Mercado Pago" }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    console.error("[pagamentos/assinar]", JSON.stringify(err, null, 2))
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
