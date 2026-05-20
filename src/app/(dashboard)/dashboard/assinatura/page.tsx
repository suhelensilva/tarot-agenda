"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Crown, Check, X, Sparkles, Zap, Lock, TrendingDown, Loader2 } from "lucide-react"
import { planLabel } from "@/lib/plan"

type PlanFeature = { text: string; included: boolean }

const FREE_FEATURES: PlanFeature[] = [
  { text: "1 atendente", included: true },
  { text: "Até 30 clientes", included: true },
  { text: "Agendamentos ilimitados", included: true },
  { text: "Até 5 serviços", included: true },
  { text: "Link público de agendamento", included: true },
  { text: "Fichas e relatórios", included: false },
  { text: "Categorias e fotos nos serviços", included: false },
  { text: "Importar e exportar contatos", included: false },
  { text: "WhatsApp automático", included: false },
]

const PRO_FEATURES: PlanFeature[] = [
  { text: "Até 2 atendentes", included: true },
  { text: "Até 80 clientes", included: true },
  { text: "Agendamentos ilimitados", included: true },
  { text: "Serviços ilimitados", included: true },
  { text: "Link público de agendamento", included: true },
  { text: "Fichas e relatórios básicos", included: true },
  { text: "Categorias e fotos nos serviços", included: true },
  { text: "Importar e exportar contatos", included: true },
  { text: "WhatsApp automático", included: true },
]

const PREMIUM_FEATURES: PlanFeature[] = [
  { text: "Atendentes ilimitados", included: true },
  { text: "Clientes ilimitados", included: true },
  { text: "Agendamentos ilimitados", included: true },
  { text: "Serviços ilimitados", included: true },
  { text: "Link público personalizado", included: true },
  { text: "Fichas e relatórios avançados", included: true },
  { text: "Categorias e fotos nos serviços", included: true },
  { text: "Importar e exportar contatos", included: true },
  { text: "WhatsApp automático", included: true },
  { text: "Suporte prioritário", included: true },
]

// Preços
const PRICES = {
  PRO:     { monthly: 19.90, annual: 15.00 },
  PREMIUM: { monthly: 29.90, annual: 20.00 },
}

function discount(monthly: number, annual: number) {
  return Math.round((1 - annual / monthly) * 100)
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function FeatureList({ features }: { features: PlanFeature[] }) {
  return (
    <ul className="space-y-2.5 flex-1 mb-6">
      {features.map((f) => (
        <li key={f.text} className={`flex items-start gap-2 text-sm ${f.included ? "text-gray-700" : "text-gray-400"}`}>
          {f.included
            ? <Check size={15} className="shrink-0 mt-0.5 text-purple-500" />
            : <X size={15} className="shrink-0 mt-0.5 text-gray-300" />
          }
          {f.text}
        </li>
      ))}
    </ul>
  )
}

export default function AssinaturaPage() {
  const { data: session } = useSession()
  const currentPlan = session?.user?.plan ?? "FREE"
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSubscribe(plan: "PRO" | "PREMIUM") {
    setLoading(plan)
    try {
      const res = await fetch("/api/pagamentos/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          cycle: billing === "monthly" ? "MONTHLY" : "ANNUAL",
          paymentMethod: billing === "annual" ? "credit_card" : undefined,
        }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        alert(`Erro: ${data.error ?? "Sem checkoutUrl na resposta"}`)
      }
    } catch {
      alert("Erro ao conectar com o servidor.")
    } finally {
      setLoading(null)
    }
  }

  const proDiscount  = discount(PRICES.PRO.monthly, PRICES.PRO.annual)
  const premDiscount = discount(PRICES.PREMIUM.monthly, PRICES.PREMIUM.annual)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-8 overflow-y-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Assinatura</h1>
          <p className="text-gray-500 text-sm mt-0.5">Escolha o plano ideal para o seu negócio</p>
        </div>

        {/* Current plan badge */}
        <div className="mb-7 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
            <Crown size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-900">
              Você está no plano <span className="font-bold">{planLabel(currentPlan)}</span>
              {currentPlan === "PREMIUM" && " ✨"}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">
              {currentPlan === "PREMIUM"
                ? "Você tem acesso a todos os recursos da plataforma"
                : currentPlan === "PRO"
                ? "Faça upgrade para Premium e desbloqueie tudo"
                : "Faça upgrade para desbloquear mais recursos"}
            </p>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === "annual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Anual
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                até {premDiscount}% off
              </span>
            </button>
          </div>
        </div>

        {/* Annual info banner */}
        {billing === "annual" && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 mb-6 max-w-4xl">
            <TrendingDown size={16} className="shrink-0 text-green-600" />
            <span>
              No plano anual você paga <strong>1 cobrança</strong> no Pix (à vista) ou parcela em <strong>até 12x no cartão</strong>. Sem Pix parcelado.
            </span>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-5 max-w-4xl">

          {/* Free */}
          <div className={`rounded-2xl border-2 bg-white p-6 flex flex-col ${currentPlan === "FREE" ? "border-gray-300" : "border-gray-200"}`}>
            <div className="mb-4">
              {currentPlan === "FREE" && (
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Plano atual</p>
              )}
              <h2 className="text-xl font-bold text-gray-900">Grátis</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$0
                <span className="text-base font-normal text-gray-500">/mês</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Para sempre gratuito</p>
            </div>
            <FeatureList features={FREE_FEATURES} />
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm font-medium py-2.5 text-center cursor-default select-none">
              {currentPlan === "FREE" ? "Plano atual" : "Grátis"}
            </div>
          </div>

          {/* Pró */}
          <div className={`rounded-2xl border-2 bg-white p-6 flex flex-col relative ${currentPlan === "PRO" ? "border-purple-500" : "border-purple-300"}`}>
            {currentPlan === "PRO" && (
              <div className="absolute top-4 right-4">
                <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">Atual</span>
              </div>
            )}
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 mb-1">Pró</p>
              <h2 className="text-xl font-bold text-gray-900">Pró</h2>

              {billing === "monthly" ? (
                <>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    R${fmt(PRICES.PRO.monthly)}
                    <span className="text-base font-normal text-gray-500">/mês</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Cobrado mensalmente</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    R${fmt(PRICES.PRO.annual)}
                    <span className="text-base font-normal text-gray-500">/mês</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400 line-through">R${fmt(PRICES.PRO.monthly)}/mês</p>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {proDiscount}% off
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    R${fmt(PRICES.PRO.annual * 12)}/ano — Pix à vista ou 12x no cartão
                  </p>
                </>
              )}
            </div>
            <FeatureList features={PRO_FEATURES} />
            {currentPlan === "PRO" ? (
              <div className="w-full rounded-lg border border-purple-200 bg-purple-50 text-purple-600 text-sm font-medium py-2.5 text-center">
                ✓ Plano atual
              </div>
            ) : currentPlan === "PREMIUM" ? (
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm font-medium py-2.5 text-center cursor-default">
                Você já tem o Premium
              </div>
            ) : (
              <button
                onClick={() => handleSubscribe("PRO")}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {loading === "PRO" ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                {loading === "PRO" ? "Aguarde..." : "Assinar Pró"}
              </button>
            )}
            <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Lock size={11} /> Pagamento seguro via Mercado Pago
            </p>
          </div>

          {/* Premium */}
          <div className={`rounded-2xl border-2 bg-white p-6 flex flex-col relative overflow-hidden ${currentPlan === "PREMIUM" ? "border-purple-600" : "border-purple-500"}`}>
            <div className="absolute top-4 right-4">
              {currentPlan === "PREMIUM" ? (
                <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">Atual</span>
              ) : (
                <span className="flex items-center gap-1 bg-purple-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Sparkles size={11} /> Recomendado
                </span>
              )}
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-1">Premium</p>
              <h2 className="text-xl font-bold text-gray-900">Premium</h2>

              {billing === "monthly" ? (
                <>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    R${fmt(PRICES.PREMIUM.monthly)}
                    <span className="text-base font-normal text-gray-500">/mês</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Cobrado mensalmente</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    R${fmt(PRICES.PREMIUM.annual)}
                    <span className="text-base font-normal text-gray-500">/mês</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400 line-through">R${fmt(PRICES.PREMIUM.monthly)}/mês</p>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {premDiscount}% off
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    R${fmt(PRICES.PREMIUM.annual * 12)}/ano — Pix à vista ou 12x no cartão
                  </p>
                </>
              )}
            </div>
            <FeatureList features={PREMIUM_FEATURES} />
            {currentPlan === "PREMIUM" ? (
              <div className="w-full rounded-lg border border-purple-200 bg-purple-50 text-purple-600 text-sm font-medium py-2.5 text-center">
                ✓ Plano atual
              </div>
            ) : (
              <button
                onClick={() => handleSubscribe("PREMIUM")}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {loading === "PREMIUM" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {loading === "PREMIUM" ? "Aguarde..." : "Assinar Premium"}
              </button>
            )}
            <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Lock size={11} /> Pagamento seguro via Mercado Pago
            </p>
          </div>

        </div>

        {/* FAQ */}
        <div className="mt-10 max-w-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Perguntas frequentes</h3>
          <div className="space-y-3">
            {[
              {
                q: "Qual a diferença entre mensal e anual?",
                a: `No mensal você é cobrada todo mês (Pró R$${fmt(PRICES.PRO.monthly)} ou Premium R$${fmt(PRICES.PREMIUM.monthly)}). No anual você paga uma única vez com desconto — Pró R$${fmt(PRICES.PRO.annual * 12)}/ano (${proDiscount}% off) ou Premium R$${fmt(PRICES.PREMIUM.annual * 12)}/ano (${premDiscount}% off).`,
              },
              {
                q: "Posso pagar o anual parcelado?",
                a: "Sim! O plano anual pode ser pago à vista no Pix ou parcelado em até 12x no cartão de crédito. Pix parcelado não está disponível.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim! No plano mensal cancele a qualquer momento e mantenha o acesso até o fim do período. No anual, o acesso segue até o fim do ano contratado.",
              },
              {
                q: "Como funciona o plano grátis?",
                a: "Você usa o Mística Agenda gratuitamente com até 30 clientes e as funções essenciais de agendamento, para sempre.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-800 mb-1">{q}</p>
                <p className="text-sm text-gray-500">{a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
