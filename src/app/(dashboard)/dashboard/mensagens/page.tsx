"use client"

import { useEffect, useState } from "react"
import { MessageSquare, Save, Info } from "lucide-react"

type Template = {
  type: string
  content: string
  active: boolean
  saved: boolean
}

const typeConfig: Record<string, { label: string; desc: string; badge: string }> = {
  REMINDER_48H:  { label: "Lembrete 48h antes",  desc: "Enviado 2 dias antes da sessão",      badge: "bg-blue-100 text-blue-700" },
  REMINDER_24H:  { label: "Lembrete 24h antes",  desc: "Enviado 1 dia antes da sessão",       badge: "bg-purple-100 text-purple-700" },
  REMINDER_1H:   { label: "Lembrete 1h antes",   desc: "Enviado 1 hora antes da sessão",      badge: "bg-orange-100 text-orange-700" },
  PREPARATION:   { label: "Mensagem de preparo",  desc: "Enviada logo após o agendamento",     badge: "bg-green-100 text-green-700" },
  CONFIRMATION:  { label: "Confirmação",          desc: "Enviada ao confirmar o agendamento",  badge: "bg-gray-100 text-gray-600" },
}

const variables = [
  { var: "{{nome}}",  desc: "Nome da cliente" },
  { var: "{{data}}",  desc: "Data da sessão" },
  { var: "{{hora}}",  desc: "Horário da sessão" },
  { var: "{{link}}",  desc: "Link da chamada (se houver)" },
]

export default function MensagensPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/mensagens").then((r) => r.json()).then(setTemplates)
  }, [])

  function update(type: string, field: keyof Template, value: string | boolean) {
    setTemplates((prev) => prev.map((t) => t.type === type ? { ...t, [field]: value } : t))
  }

  async function handleSave(template: Template) {
    setSaving(template.type)
    await fetch("/api/mensagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: template.type, content: template.content, active: template.active }),
    })
    setSaving(null)
    setSaved(template.type)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mensagens</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure os textos enviados automaticamente pelo WhatsApp</p>
      </div>

      {/* Variáveis disponíveis */}
      <div className="bg-purple-50 dark:bg-[rgba(170,85,249,0.08)] border border-purple-100 dark:border-[rgba(170,85,249,0.2)] rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-purple-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-purple-800 dark:text-[#aa55f9] mb-2">Variáveis disponíveis nas mensagens</p>
          <div className="flex flex-wrap gap-3">
            {variables.map((v) => (
              <div key={v.var} className="flex items-center gap-1.5 text-sm">
                <code className="bg-purple-100 dark:bg-[rgba(170,85,249,0.2)] text-purple-700 dark:text-[#aa55f9] px-1.5 py-0.5 rounded font-mono text-xs">{v.var}</code>
                <span className="text-purple-600 dark:text-purple-300">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-4">
        {templates.map((t) => {
          const config = typeConfig[t.type]
          return (
            <div key={t.type} className={`bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6 transition-opacity ${!t.active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={15} className="text-gray-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{config.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
                      {config.desc}
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t.active ? "Ativo" : "Inativo"}</span>
                  <div
                    onClick={() => update(t.type, "active", !t.active)}
                    className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${t.active ? "bg-purple-500" : "bg-gray-200 dark:bg-white/10"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${t.active ? "translate-x-5" : "translate-x-1"}`} />
                  </div>
                </label>
              </div>

              <textarea
                rows={3}
                value={t.content}
                onChange={(e) => update(t.type, "content", e.target.value)}
                className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] resize-none mb-3"
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Preview: {t.content
                    .replace("{{nome}}", "Maria")
                    .replace("{{data}}", "10/05")
                    .replace("{{hora}}", "15:00")
                    .replace("{{link}}", "meet.google.com/xxx")
                    .slice(0, 80)}
                  {t.content.length > 80 ? "..." : ""}
                </p>
                <button
                  onClick={() => handleSave(t)}
                  disabled={saving === t.type}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-60"
                >
                  <Save size={13} />
                  {saving === t.type ? "Salvando..." : saved === t.type ? "Salvo!" : "Salvar"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
