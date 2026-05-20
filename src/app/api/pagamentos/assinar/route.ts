import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMPClient, PreApproval, PLAN_PRICES, PLAN_NAMES } from "@/lib/mercadopago"
import { z } from "zod"

const schema = z.object({
  plan: z.enum(["PRO", "PREMIUM"]),
  cycle: z.enum(["MONTHLY", "ANNUAL"]),
  // Para anual: método de pagamento escolhido
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

    // ── MENSAL: assinatura recorrente ─────────────────────────────────────────
    if (cycle === "MONTHLY") {
      const preApproval = new PreApproval(client)
      const result = await preApproval.create({
        body: {
          reason: `Mística Agenda — Plano ${planName} Mensal`,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: PLAN_PRICES[plan].MONTHLY,
            currency_id: "BRL",
          },
          back_url: `${baseUrl}/dashboard/assinatura?status=success&plan=${plan}&cycle=monthly`,
          payer_email: session.user.email!,
          external_reference: `${session.user.id}|${plan}|MONTHLY`,
        },
      })

      const checkoutUrl = result.init_point
      if (!checkoutUrl) {
        console.error("[pagamentos/assinar] init_point ausente", JSON.stringify(result, null, 2))
        return NextResponse.json({ error: "URL de checkout não retornada pelo Mercado Pago" }, { status: 500 })
      }
      return NextResponse.json({ checkoutUrl })
    }

    // ── ANUAL: pagamento único ────────────────────────────────────────────────
    const amount = PLAN_PRICES[plan].ANNUAL

    // Para anual retornamos um preference (Checkout Pro) que aceita Pix e cartão
    const { Preference } = await import("mercadopago")
    const preference = new Preference(client)

    const prefResult = await preference.create({
      body: {
        items: [{
          id: `${plan}_ANNUAL`,
          title: `Mística Agenda — Plano ${planName} Anual`,
          quantity: 1,
          unit_price: amount,
          currency_id: "BRL",
        }],
        payment_methods: {
          excluded_payment_types: paymentMethod === "pix"
            ? [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }]
            : [{ id: "ticket" }],
          installments: paymentMethod === "credit_card" ? 12 : 1,
        },
        back_urls: {
          success: `${baseUrl}/dashboard/assinatura?status=success&plan=${plan}&cycle=annual`,
          failure: `${baseUrl}/dashboard/assinatura?status=failure`,
          pending: `${baseUrl}/dashboard/assinatura?status=pending`,
        },
        auto_return: "approved",
        external_reference: `${session.user.id}|${plan}|ANNUAL`,
        notification_url: `${baseUrl}/api/pagamentos/webhook`,
      },
    })

    const checkoutUrl = prefResult.init_point
    if (!checkoutUrl) {
      console.error("[pagamentos/assinar] init_point ausente (anual)", JSON.stringify(prefResult, null, 2))
      return NextResponse.json({ error: "URL de checkout não retornada pelo Mercado Pago" }, { status: 500 })
    }
    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    console.error("[pagamentos/assinar]", JSON.stringify(err, null, 2))
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
