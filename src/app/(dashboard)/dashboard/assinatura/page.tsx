"use client"

import { Crown, Check, Sparkles, Zap, Lock } from "lucide-react"

const FREE_FEATURES = [
  "Até 30 clientes",
  "Agendamentos ilimitados",
  "Link público de agendamento",
  "Fichas e relatórios básicos",
  "Lembretes manuais por WhatsApp",
]

const PRO_FEATURES = [
  "Clientes ilimitados",
  "Agendamentos ilimitados",
  "Link público personalizado",
  "Fichas e relatórios avançados",
  "Lembretes automáticos por WhatsApp",
  "Categorias e fotos nos serviços",
  "Importar e exportar contatos",
  "Relatórios financeiros detalhados",
  "Suporte prioritário",
]

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
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">

          {/* Free plan */}
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 flex flex-col">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Plano atual</p>
              <h2 className="text-xl font-bold text-gray-900">Grátis</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$0
                <span className="text-base font-normal text-gray-500">/mês</span>
              </p>
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check size={15} className="shrink-0 mt-0.5 text-gray-400" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm font-medium py-2.5 text-center cursor-default select-none">
              Plano atual
            </div>
          </div>

          {/* Pro plan */}
          <div className="rounded-2xl border-2 border-purple-500 bg-white p-6 flex flex-col relative overflow-hidden">
            {/* Recommended badge */}
            <div className="absolute top-4 right-4">
              <span className="flex items-center gap-1 bg-purple-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                <Sparkles size={11} />
                Recomendado
              </span>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-1">Upgrade</p>
              <h2 className="text-xl font-bold text-gray-900">Pro</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$19,90
                <span className="text-base font-normal text-gray-500">/mês</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Cancele quando quiser</p>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check size={15} className="shrink-0 mt-0.5 text-purple-500" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors opacity-60 cursor-not-allowed"
            >
              <Zap size={15} />
              Em breve
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
                a: "Você pode usar o Mística Agenda sem pagar nada, com até 30 clientes cadastrados e todas as funções básicas."
              },
              {
                q: "Posso cancelar o Pro quando quiser?",
                a: "Sim! Você pode cancelar a qualquer momento e continuará com acesso até o fim do período pago."
              },
              {
                q: "Como será feito o pagamento?",
                a: "Aceitaremos cartão de crédito e Pix. Em breve abriremos as assinaturas."
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
