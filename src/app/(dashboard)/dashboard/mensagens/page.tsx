"use client"

import { useEffect, useState, useCallback } from "react"
import { MessageSquare, Save, Info, Smartphone, CheckCircle2, Loader2, X, RefreshCw, Unplug, Wifi, WifiOff } from "lucide-react"

type Template = {
  type: string
  content: string
  active: boolean
  saved: boolean
}

type WaStatus = {
  configured: boolean
  connected: boolean
  instanceExists: boolean
  qr?: string | null
  profileName?: string
  error?: string
}

const typeConfig: Record<string, { label: string; desc: string; badge: string }> = {
  REMINDER_48H:  { label: "Lembrete 48h antes",  desc: "Enviado 2 dias antes da sessão",      badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  REMINDER_24H:  { label: "Lembrete 24h antes",  desc: "Enviado 1 dia antes da sessão",       badge: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" },
  REMINDER_1H:   { label: "Lembrete 1h antes",   desc: "Enviado 1 hora antes da sessão",      badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" },
  PREPARATION:   { label: "Mensagem de preparo",  desc: "Enviada logo após o agendamento",     badge: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" },
  CONFIRMATION:  { label: "Confirmação",          desc: "Enviada ao confirmar o agendamento",  badge: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400" },
}

const variables = [
  { var: "{{nome}}",    desc: "Nome da cliente" },
  { var: "{{data}}",    desc: "Data da sessão" },
  { var: "{{hora}}",    desc: "Horário da sessão" },
  { var: "{{link}}",    desc: "Link da chamada (se houver)" },
  { var: "{{servico}}", desc: "Nome do serviço" },
]

export default function MensagensPage() {
  const [templates, setTemplates]   = useState<Template[]>([])
  const [saving, setSaving]         = useState<string | null>(null)
  const [saved, setSaved]           = useState<string | null>(null)
  const [waStatus, setWaStatus]     = useState<WaStatus | null>(null)
  const [waLoading, setWaLoading]   = useState(false)
  const [showQr, setShowQr]         = useState(false)
  const [polling, setPolling]       = useState(false)

  useEffect(() => {
    fetch("/api/mensagens").then((r) => r.json()).then(setTemplates)
    checkStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status")
      const data: WaStatus = await res.json()
      setWaStatus(data)
      return data
    } catch {
      return null
    }
  }, [])

  // Polling quando QR está sendo exibido
  useEffect(() => {
    if (!showQr || !polling) return
    const interval = setInterval(async () => {
      const data = await checkStatus()
      if (data?.connected) {
        setShowQr(false)
        setPolling(false)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [showQr, polling, checkStatus])

  async function handleConnect() {
    setWaLoading(true)
    try {
      const res = await fetch("/api/whatsapp/instancia", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "Erro ao criar instância")
        return
      }
      // Busca QR code logo após criar
      await checkStatus()
      setShowQr(true)
      setPolling(true)
    } finally {
      setWaLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm("Desconectar o WhatsApp desta conta?")) return
    setWaLoading(true)
    try {
      await fetch("/api/whatsapp/instancia", { method: "DELETE" })
      await checkStatus()
      setShowQr(false)
      setPolling(false)
    } finally {
      setWaLoading(false)
    }
  }

  async function handleRefreshQr() {
    await checkStatus()
  }

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

      {/* ─── Card de conexão WhatsApp ─── */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
            <Smartphone size={18} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Conexão WhatsApp</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Via Evolution API — seu número pessoal ou comercial</p>
          </div>
        </div>

        {/* Não configurado no servidor */}
        {waStatus && !waStatus.configured && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-xl p-4">
            <WifiOff size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Evolution API não configurada</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Para ativar o WhatsApp automático, adicione as variáveis de ambiente no Vercel:
              </p>
              <div className="mt-2 space-y-1">
                <code className="block text-xs bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-1 rounded font-mono">EVOLUTION_API_URL=https://seu-servidor.com</code>
                <code className="block text-xs bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-1 rounded font-mono">EVOLUTION_API_KEY=sua-chave-global</code>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Ainda não tem um servidor? Veja as opções abaixo 👇
              </p>
            </div>
          </div>
        )}

        {/* Conectado */}
        {waStatus?.configured && waStatus.connected && (
          <div className="flex items-center justify-between gap-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/25 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">WhatsApp conectado ✅</p>
                {waStatus.profileName && (
                  <p className="text-xs text-green-600 dark:text-green-400">{waStatus.profileName}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={waLoading}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Unplug size={13} />
              Desconectar
            </button>
          </div>
        )}

        {/* Desconectado / sem instância */}
        {waStatus?.configured && !waStatus.connected && !showQr && (
          <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <WifiOff size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">WhatsApp desconectado</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Conecte para enviar mensagens automáticas</p>
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={waLoading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {waLoading ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
              {waLoading ? "Aguarde..." : "Conectar WhatsApp"}
            </button>
          </div>
        )}

        {/* QR Code */}
        {showQr && waStatus?.configured && !waStatus.connected && (
          <div className="border border-gray-200 dark:border-[rgba(170,85,249,0.2)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Escaneie o QR Code</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Abra o WhatsApp → Dispositivos Vinculados → Vincular um dispositivo
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshQr}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Atualizar QR"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={() => { setShowQr(false); setPolling(false) }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {waStatus.qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={waStatus.qr.startsWith("data:") ? waStatus.qr : `data:image/png;base64,${waStatus.qr}`}
                  alt="QR Code WhatsApp"
                  className="w-48 h-48 rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,0.08)]"
                />
              ) : (
                <div className="w-48 h-48 rounded-xl border border-dashed border-gray-200 dark:border-[rgba(255,255,255,0.1)] flex flex-col items-center justify-center gap-2">
                  <Loader2 size={24} className="animate-spin text-gray-300 dark:text-gray-600" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">Gerando QR...</p>
                </div>
              )}
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Abra o WhatsApp no celular</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Toque em <strong>Dispositivos Vinculados</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Toque em <strong>Vincular um dispositivo</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span>Aponte a câmera para este QR</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-[#aa55f9]">
                  <Loader2 size={12} className="animate-spin" />
                  Aguardando conexão...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Carregando status inicial */}
        {!waStatus && (
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <Loader2 size={15} className="animate-spin" />
            Verificando status...
          </div>
        )}
      </div>

      {/* ─── Como obter um servidor Evolution API ─── */}
      {waStatus && !waStatus.configured && (
        <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🚀</span> Como configurar a Evolution API
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-green-200 dark:border-green-500/20 rounded-xl p-4 bg-green-50 dark:bg-green-500/8">
              <p className="font-semibold text-green-800 dark:text-green-300 text-sm mb-1">Opção 1 — Railway</p>
              <p className="text-xs text-green-700 dark:text-green-400 mb-2">Deploy em 1 clique, plano gratuito disponível</p>
              <a href="https://railway.app/template/UBDd3J" target="_blank" rel="noopener noreferrer"
                className="text-xs text-green-700 dark:text-green-400 underline">
                railway.app/template/evolution
              </a>
            </div>
            <div className="border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 bg-blue-50 dark:bg-blue-500/8">
              <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm mb-1">Opção 2 — VPS</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">Hostinger VPS a partir de R$17/mês</p>
              <a href="https://doc.evolution-api.com/v2/pt/install/docker" target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-700 dark:text-blue-400 underline">
                Guia de instalação Docker
              </a>
            </div>
            <div className="border border-purple-200 dark:border-[rgba(170,85,249,0.25)] rounded-xl p-4 bg-purple-50 dark:bg-[rgba(170,85,249,0.06)]">
              <p className="font-semibold text-purple-800 dark:text-[#aa55f9] text-sm mb-1">Opção 3 — EvoAPI</p>
              <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">Serviço gerenciado (sem instalar nada)</p>
              <a href="https://evoapi.io" target="_blank" rel="noopener noreferrer"
                className="text-xs text-purple-700 dark:text-[#aa55f9] underline">
                evoapi.io
              </a>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Após obter a URL e a chave da API, adicione <code className="bg-gray-100 dark:bg-white/5 px-1 rounded font-mono">EVOLUTION_API_URL</code> e <code className="bg-gray-100 dark:bg-white/5 px-1 rounded font-mono">EVOLUTION_API_KEY</code> nas variáveis de ambiente do Vercel.
          </p>
        </div>
      )}

      {/* ─── Variáveis disponíveis ─── */}
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

      {/* ─── Templates ─── */}
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
                    .replace("{{servico}}", "Tarot do Amor")
                    .slice(0, 80)}
                  {t.content.length > 80 ? "..." : ""}
                </p>
                <button
                  onClick={() => handleSave(t)}
                  disabled={saving === t.type}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-60"
                >
                  <Save size={13} />
                  {saving === t.type ? "Salvando..." : saved === t.type ? "Salvo ✓" : "Salvar"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
