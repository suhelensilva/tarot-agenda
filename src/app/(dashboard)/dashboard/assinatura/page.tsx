"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Crown, Check, X, Sparkles, Zap, Lock, TrendingDown, Loader2, AlertTriangle, PartyPopper } from "lucide-react"
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

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
}

function FeatureList({ features }: { features: PlanFeature[] }) {
  return (
    <ul className="space-y-2.5 flex-1 mb-6">
      {features.map((f) => (
        <li key={f.text} className={`flex items-start gap-2 text-sm ${f.included ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}`}>
          {f.included
            ? <Check size={15} className="shrink-0 mt-0.5 text-purple-500" />
            : <X size={15} className="shrink-0 mt-0.5 text-gray-300 dark:text-gray-600" />
          }
          {f.text}
        </li>
      ))}
    </ul>
  )
}

type Subscription = {
  id: string
  plan: string
  billingCycle: string
  status: string
  currentPeriodEnd: string | null
  cancelledAt: string | null
}

export default function AssinaturaPage() {
  const { data: session, update: updateSession } = useSession()
  const searchParams = useSearchParams()
  const currentPlan = session?.user?.plan ?? "FREE"
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const [loading, setLoading] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const status = searchParams.get("status")
    if (status !== "success") return

    setProcessingPayment(true)
    window.history.replaceState({}, "", "/dashboard/assinatura")

    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch("/api/pagamentos/assinatura")
        const data = await res.json()
        if (data.subscription?.status === "ACTIVE") {
          clearInterval(pollRef.current!)
          await updateSession()
          setProcessingPayment(false)
          setSubscription(data.subscription)
        }
      } catch { /* ignora */ }
      if (attempts >= 30) {
        clearInterval(pollRef.current!)
        setProcessingPayment(false)
      }
    }, 2000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetch("/api/pagamentos/assinatura")
      .then(r => r.json())
      .then(d => setSubscription(d.subscription ?? null))
      .catch(() => {})
  }, [currentPlan])

  async function handleSubscribe(plan: "PRO" | "PREMIUM") {
    setLoading(plan)
    try {
      const res = await fetch("/api/pagamentos/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          cycle: billing === "monthly" ? "MONTHLY" : "ANNUAL",
        }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        alert(`Erro: ${data.error ?? "Sem URL de checkout na resposta"}`)
      }
    } catch {
      alert("Erro ao conectar com o servidor.")
    } finally {
      setLoading(null)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch("/api/pagamentos/cancelar", { method: "POST" })
      if (res.ok) {
        await updateSession()
        setCancelConfirm(false)
        setSubscription(null)
      } else {
        alert("Erro ao cancelar. Tente novamente.")
      }
    } catch {
      alert("Erro ao conectar com o servidor.")
    } finally {
      setCancelling(false)
    }
  }

  const proDiscount  = discount(PRICES.PRO.monthly, PRICES.PRO.annual)
  const premDiscount = discount(PRICES.PREMIUM.monthly, PRICES.PREMIUM.annual)
  const hasActiveSub = subscription && subscription.status === "ACTIVE" && currentPlan !== "FREE"
  const cycleLabel   = subscription?.billingCycle === "MONTHLY" ? "mensal" : "anual"

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-8 overflow-y-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assinatura</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Escolha o plano ideal para o seu negócio</p>
        </div>

        {/* Banner processando pagamento */}
        {processingPayment && (
          <div className="mb-5 flex items-center gap-3 bg-purple-50 dark:bg-[rgba(170,85,249,0.1)] border border-purple-200 dark:border-[rgba(170,85,249,0.3)] rounded-xl px-5 py-4">
            <Loader2 size={18} className="text-purple-500 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-semibold text-purple-900 dark:text-[#aa55f9]">Confirmando seu pagamento…</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">Aguarde alguns segundos, seus recursos serão liberados automaticamente.</p>
            </div>
          </div>
        )}

        {/* Banner sucesso — plano já ativo */}
        {!processingPayment && currentPlan !== "FREE" && searchParams.get("status") === null && subscription?.status === "ACTIVE" && (
          <div className="mb-5 flex items-center gap-3 bg-green-50 dark:bg-[rgba(34,197,94,0.08)] border border-green-200 dark:border-[rgba(34,197,94,0.25)] rounded-xl px-5 py-4">
            <PartyPopper size={18} className="text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm font-semibold text-green-800 dark:text-green-400">Plano {planLabel(currentPlan)} ativo! Aproveite todos os recursos. 🎉</p>
          </div>
        )}

        {/* Current plan badge */}
        <div className="mb-5 flex items-center justify-between gap-3 bg-purple-50 dark:bg-[rgba(170,85,249,0.1)] border border-purple-200 dark:border-[rgba(170,85,249,0.3)] rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-[rgba(170,85,249,0.2)] flex items-center justify-center shrink-0">
              <Crown size={18} className="text-purple-600 dark:text-[#aa55f9]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-900 dark:text-[#aa55f9]">
                Você está no plano <span className="font-bold">{planLabel(currentPlan)}</span>
                {currentPlan === "PREMIUM" && " ✨"}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                {hasActiveSub
                  ? `Assinatura ${cycleLabel} · ${subscription?.currentPeriodEnd ? `próxima renovação em ${fmtDate(subscription.currentPeriodEnd)}` : "ativa"}`
                  : currentPlan === "PREMIUM"
                  ? "Você tem acesso a todos os recursos da plataforma"
                  : currentPlan === "PRO"
                  ? "Faça upgrade para Premium e desbloqueie tudo"
                  : "Faça upgrade para desbloquear mais recursos"}
              </p>
            </div>
          </div>

          {hasActiveSub && !cancelConfirm && (
            <button
              onClick={() => setCancelConfirm(true)}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 underline underline-offset-2 shrink-0"
            >
              Cancelar assinatura
            </button>
          )}
        </div>

        {/* Confirm cancel */}
        {cancelConfirm && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 dark:bg-[rgba(239,68,68,0.08)] border border-red-200 dark:border-[rgba(239,68,68,0.25)] rounded-xl px-5 py-4">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-400">Cancelar assinatura?</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Seu plano voltará para Grátis imediatamente e você perderá acesso aos recursos pagos.
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                >
                  {cancelling && <Loader2 size={12} className="animate-spin" />}
                  Sim, cancelar
                </button>
                <button
                  onClick={() => setCancelConfirm(false)}
                  disabled={cancelling}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-4 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.1)] hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Não, manter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] rounded-xl p-1 gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                billing === "annual"
                  ? "bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Anual
              <span className="bg-green-100 dark:bg-[rgba(34,197,94,0.15)] text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                até {premDiscount}% off
              </span>
            </button>
          </div>
        </div>

        {/* Annual info banner */}
        {billing === "annual" && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-[rgba(34,197,94,0.08)] border border-green-200 dark:border-[rgba(34,197,94,0.2)] rounded-xl px-4 py-3 text-sm text-green-800 dark:text-green-400 mb-6 max-w-4xl">
            <TrendingDown size={16} className="shrink-0 text-green-600 dark:text-green-400" />
            <span>
              No plano anual você paga <strong>1 cobrança anual</strong> no cartão de crédito com desconto. O Stripe renova automaticamente a cada ano.
            </span>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-5 max-w-4xl">

          {/* Free */}
          <div className={`rounded-2xl border-2 bg-white dark:bg-[#13131f] p-6 flex flex-col ${currentPlan === "FREE" ? "border-gray-300 dark:border-gray-600" : "border-gray-200 dark:border-[rgba(255,255,255,0.08)]"}`}>
            <div className="mb-4">
              {currentPlan === "FREE" && (
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">Plano atual</p>
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Grátis</h2>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                R$0
                <span className="text-base font-normal text-gray-500 dark:text-gray-400">/mês</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Para sempre gratuito</p>
            </div>
            <FeatureList features={FREE_FEATURES} />
            <div className="w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.08)] bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] text-gray-400 dark:text-gray-600 text-sm font-medium py-2.5 text-center cursor-default select-none">
              {currentPlan === "FREE" ? "Plano atual" : "Grátis"}
            </div>
          </div>

          {/* Pró */}
          <div className={`rounded-2xl border-2 bg-white dark:bg-[#13131f] p-6 flex flex-col relative ${currentPlan === "PRO" ? "border-purple-500" : "border-purple-300 dark:border-[rgba(170,85,249,0.35)]"}`}>
            {currentPlan === "PRO" && (
              <div className="absolute top-4 right-4">
                <span className="bg-purple-100 dark:bg-[rgba(170,85,249,0.15)] text-purple-700 dark:text-[#aa55f9] text-xs font-semibold px-2.5 py-1 rounded-full">Atual</span>
              </div>
            )}
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 mb-1">Pró</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pró</h2>

              {billing === "monthly" ? (
                <>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    R${fmt(PRICES.PRO.monthly)}
                    <span className="text-base font-normal text-gray-500 dark:text-gray-400">/mês</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Cobrado mensalmente</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    R${fmt(PRICES.PRO.annual)}
                    <span className="text-base font-normal text-gray-500 dark:text-gray-400">/mês</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500 line-through">R${fmt(PRICES.PRO.monthly)}/mês</p>
                    <span className="bg-green-100 dark:bg-[rgba(34,197,94,0.15)] text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      {proDiscount}% off
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    R${fmt(PRICES.PRO.annual * 12)}/ano — cobrado anualmente no cartão
                  </p>
                </>
              )}
            </div>
            <FeatureList features={PRO_FEATURES} />
            {currentPlan === "PRO" ? (
              <div className="w-full rounded-lg border border-purple-200 dark:border-[rgba(170,85,249,0.3)] bg-purple-50 dark:bg-[rgba(170,85,249,0.08)] text-purple-600 dark:text-[#aa55f9] text-sm font-medium py-2.5 text-center">
                ✓ Plano atual
              </div>
            ) : currentPlan === "PREMIUM" ? (
              <div className="w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.08)] bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] text-gray-400 dark:text-gray-600 text-sm font-medium py-2.5 text-center cursor-default">
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
            <p className="text-xs text-center text-gray-400 dark:text-gray-600 mt-2 flex items-center justify-center gap-1">
              <Lock size={11} /> Pagamento seguro via Stripe
            </p>
          </div>

          {/* Premium */}
          <div className={`rounded-2xl border-2 bg-white dark:bg-[#13131f] p-6 flex flex-col relative overflow-hidden ${currentPlan === "PREMIUM" ? "border-purple-600" : "border-purple-500 dark:border-[rgba(170,85,249,0.6)]"}`}>
            <div className="absolute top-4 right-4">
              {currentPlan === "PREMIUM" ? (
                <span className="bg-purple-100 dark:bg-[rgba(170,85,249,0.15)] text-purple-700 dark:text-[#aa55f9] text-xs font-semibold px-2.5 py-1 rounded-full">Atual</span>
              ) : (
                <span className="flex items-center gap-1 bg-purple-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Sparkles size={11} /> Recomendado
                </span>
              )}
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-[#aa55f9] mb-1">Premium</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Premium</h2>

              {billing === "monthly" ? (
                <>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    R${fmt(PRICES.PREMIUM.monthly)}
                    <span className="text-base font-normal text-gray-500 dark:text-gray-400">/mês</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Cobrado mensalmente</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    R${fmt(PRICES.PREMIUM.annual)}
                    <span className="text-base font-normal text-gray-500 dark:text-gray-400">/mês</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500 line-through">R${fmt(PRICES.PREMIUM.monthly)}/mês</p>
                    <span className="bg-green-100 dark:bg-[rgba(34,197,94,0.15)] text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      {premDiscount}% off
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    R${fmt(PRICES.PREMIUM.annual * 12)}/ano — cobrado anualmente no cartão
                  </p>
                </>
              )}
            </div>
            <FeatureList features={PREMIUM_FEATURES} />
            {currentPlan === "PREMIUM" ? (
              <div className="w-full rounded-lg border border-purple-200 dark:border-[rgba(170,85,249,0.3)] bg-purple-50 dark:bg-[rgba(170,85,249,0.08)] text-purple-600 dark:text-[#aa55f9] text-sm font-medium py-2.5 text-center">
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
            <p className="text-xs text-center text-gray-400 dark:text-gray-600 mt-2 flex items-center justify-center gap-1">
              <Lock size={11} /> Pagamento seguro via Stripe
            </p>
          </div>

        </div>

        {/* FAQ */}
        <div className="mt-10 max-w-xl">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Perguntas frequentes</h3>
          <div className="space-y-3">
            {[
              {
                q: "Qual a diferença entre mensal e anual?",
                a: `No mensal você é cobrada todo mês via cartão (Pró R$${fmt(PRICES.PRO.monthly)} ou Premium R$${fmt(PRICES.PREMIUM.monthly)}). No anual você paga uma única cobrança anual com desconto — Pró R$${fmt(PRICES.PRO.annual * 12)}/ano (${proDiscount}% off) ou Premium R$${fmt(PRICES.PREMIUM.annual * 12)}/ano (${premDiscount}% off).`,
              },
              {
                q: "Quais formas de pagamento são aceitas?",
                a: "Cartão de crédito e débito (Visa, Mastercard, Elo, Amex e outros), processados com segurança pelo Stripe.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim! Cancele a qualquer momento direto nessa página. O plano volta para Grátis imediatamente.",
              },
              {
                q: "Como funciona o plano grátis?",
                a: "Você usa o Mística Agenda gratuitamente com até 30 clientes e as funções essenciais de agendamento, para sempre.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border border-gray-100 dark:border-[rgba(170,85,249,0.1)] rounded-xl p-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.03)]">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{q}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
