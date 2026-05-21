"use client"

import { Clock, MessageSquare, Sparkles } from "lucide-react"

export default function MensagensPage() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-md">

        <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-[rgba(170,85,249,0.15)] flex items-center justify-center mx-auto mb-6">
          <MessageSquare size={28} className="text-purple-500 dark:text-[#aa55f9]" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock size={14} className="text-purple-400 dark:text-[#aa55f9]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-purple-400 dark:text-[#aa55f9]">Em breve</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Mensagens automáticas
        </h1>

        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
          Em breve você poderá configurar lembretes e confirmações automáticas pelo WhatsApp — sem precisar lembrar uma por uma.
        </p>

        <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] border border-gray-100 dark:border-[rgba(170,85,249,0.1)] rounded-xl p-4 text-left space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">O que vem por aí</p>
          {[
            "Lembrete automático 48h e 24h antes da sessão",
            "Confirmação enviada na hora do agendamento",
            "Mensagem de preparo para a cliente",
            "Tudo pelo seu próprio número de WhatsApp",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <Sparkles size={13} className="text-purple-400 dark:text-[#aa55f9] shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600 dark:text-gray-300">{item}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
