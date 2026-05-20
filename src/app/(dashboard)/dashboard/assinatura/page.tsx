"use client"

import { Crown, Check, X, Sparkles, Zap, Lock } from "lucide-react"

type PlanFeature = { text: string; included: boolean }

const FREE_FEATURES: PlanFeature[] = [
  { text: "Até 30 clientes", included: true },
  { text: "Agendamentos ilimitados", included: true },
  { text: "Até 5 serviços", included: true },
  { text: "Link público de agendamento", included: true },
  { text: "Fichas e relatórios", included: false },
  { text: "Categorias e fotos nos serviços", included: false },
  { text: "Importar e exportar contatos", included: false },
  { text: "WhatsApp automático", included: false },
]

const BASIC_FEATURES: PlanFeature[] = [
  { text: "Até 80 clientes", included: true },
  { text: "Agendamentos ilimitados", included: true },
  { text: "Serviços ilimitados", included: true },
  { text: "Link público de agendamento", included: true },
  { text: "Fichas e relatórios básicos", included: true },
  { text: "Categorias e fotos nos serviços", included: true },
  { text: "Importar e exportar contatos", included: true },
  { text: "WhatsApp automático", included: true },
]

const PRO_FEATURES: PlanFeature[] = [
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
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-8 overflow-y-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Assinatura</h1>
          <p className="text-gray-500 text-sm mt-0.5">Escolha o plano ideal para o seu negócio</p>
        </div>

        {/* Current plan badge */}
        <div className="mb-8 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
            <Crown size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-900">Você está no plano <span className="font-bold">Grátis</span></p>
            <p className="text-xs text-purple-600 mt-0.5">Faça upgrade para desbloquear todos os recursos</p>
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-5 max-w-4xl">

          {/* Free */}
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 flex flex-col">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Plano atual</p>
              <h2 className="text-xl font-bold text-gray-900">Grátis</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$0
                <span className="text-base font-normal text-gray-500">/mês</span>
              </p>
            </div>
            <FeatureList features={FREE_FEATURES} />
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm font-medium py-2.5 text-center cursor-default select-none">
              Plano atual
            </div>
          </div>

          {/* Básico R$19,90 */}
          <div className="rounded-2xl border-2 border-purple-400 bg-white p-6 flex flex-col relative">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 mb-1">Básico</p>
              <h2 className="text-xl font-bold text-gray-900">Pró</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$19,90
                <span className="text-base font-normal text-gray-500">/mês</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Cancele quando quiser</p>
            </div>
            <FeatureList features={BASIC_FEATURES} />
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white rounded-lg py-2.5 text-sm font-semibold opacity-60 cursor-not-allowed"
            >
              <Zap size={15} /> Em breve
            </button>
            <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Lock size={11} /> Pagamento seguro
            </p>
          </div>

          {/* Personalizado R$29,90 */}
          <div className="rounded-2xl border-2 border-purple-600 bg-white p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="flex items-center gap-1 bg-purple-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                <Sparkles size={11} /> Recomendado
              </span>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-1">Personalizado</p>
              <h2 className="text-xl font-bold text-gray-900">Premium</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$29,90
                <span className="text-base font-normal text-gray-500">/mês</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Cancele quando quiser</p>
            </div>
            <FeatureList features={PRO_FEATURES} />
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white rounded-lg py-2.5 text-sm font-semibold opacity-60 cursor-not-allowed"
            >
              <Zap size={15} /> Em breve
            </button>
            <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Lock size={11} /> Pagamento seguro
            </p>
          </div>

        </div>

        {/* FAQ */}
        <div className="mt-10 max-w-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Perguntas frequentes</h3>
          <div className="space-y-4">
            {[
              {
                q: "Como funciona o plano grátis?",
                a: "Você usa o Mística Agenda gratuitamente com até 30 clientes e as funções essenciais de agendamento.",
              },
              {
                q: "Qual a diferença entre Pró e Premium?",
                a: "O Pró tem fichas e relatórios básicos com link público padrão. O Premium inclui relatórios avançados, link personalizado e suporte prioritário.",
              },
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim! Cancele a qualquer momento e mantenha o acesso até o fim do período pago.",
              },
              {
                q: "Como será feito o pagamento?",
                a: "Aceitaremos cartão de crédito e Pix. Em breve abriremos as assinaturas.",
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
