"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { TrendingUp, Users, XCircle, BarChart2, Crown, Lock, Upload, Sparkles, Loader2, Check } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { PlanGate } from "@/components/plan-gate"
import { getPlanLimits } from "@/lib/plan"
import Link from "next/link"

type MonthData = { label: string; revenue: number; count: number }
type ClientStat = { id: string; name: string; totalSessions: number; totalRevenue: number }
type CancelReason = { cancellationReason: string | null; _count: number }
type StatusCount = { status: string; _count: number }

type BrandSettings = {
  logoUrl?: string | null
  signature?: string | null
  slogan?: string | null
  reportAccentColor?: string | null
  reportBg?: string | null
  reportTextColor?: string | null
}

const statusLabel: Record<string, string> = {
  SCHEDULED: "Agendados",
  CONFIRMED: "Confirmados",
  COMPLETED: "Realizados",
  NO_SHOW: "Faltas",
  CANCELLED: "Cancelados",
}

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-yellow-400",
  CONFIRMED: "bg-blue-400",
  COMPLETED: "bg-green-400",
  NO_SHOW: "bg-red-400",
  CANCELLED: "bg-gray-300",
}

function BrandSection() {
  const { data: session } = useSession()
  const isPremium = getPlanLimits(session?.user?.plan).marcaRelatorio
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [brand, setBrand] = useState<BrandSettings>({
    logoUrl: null, signature: "", slogan: "",
    reportAccentColor: "#7c3aed", reportBg: "#faf5ff", reportTextColor: "#1e1b4b",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch("/api/perfil").then(r => r.json()).then(d => {
      setBrand({
        logoUrl: d.logoUrl ?? null,
        signature: d.signature ?? "",
        slogan: d.slogan ?? "",
        reportAccentColor: d.reportAccentColor ?? "#7c3aed",
        reportBg: d.reportBg ?? "#faf5ff",
        reportTextColor: d.reportTextColor ?? "#1e1b4b",
      })
    }).catch(() => {})
  }, [])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.url) setBrand(b => ({ ...b, logoUrl: data.url }))
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brand),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  // Seção bloqueada para não-Premium
  if (!isPremium) {
    return (
      <div className="bg-white border-2 border-dashed border-purple-200 rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-3">
            <Lock size={22} className="text-purple-500" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">Personalização de marca</p>
          <p className="text-sm text-gray-500 text-center max-w-xs mb-4">
            Adicione seu logo, cores e assinatura nos relatórios. Disponível no plano Premium.
          </p>
          <Link
            href="/dashboard/assinatura"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Crown size={14} /> Ver plano Premium
          </Link>
        </div>
        {/* Preview borrada atrás do lock */}
        <div className="opacity-30 pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Marca & Personalização</h2>
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Crown size={10} /> Premium
              </span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-24 bg-gray-100 rounded-xl" />
              <div className="h-8 bg-gray-100 rounded-lg" />
              <div className="h-8 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-40 bg-purple-50 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  const accent = brand.reportAccentColor ?? "#7c3aed"
  const bg     = brand.reportBg ?? "#faf5ff"
  const text   = brand.reportTextColor ?? "#1e1b4b"

  return (
    <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          <h2 className="font-semibold text-gray-900 text-sm">Marca & Personalização</h2>
          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Crown size={10} /> Premium
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saved ? "Salvo!" : saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulário */}
        <div className="space-y-4">
          {/* Logo */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Logo</label>
            <div
              onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt="logo" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  {uploading ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <Upload size={16} className="text-gray-400" />}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">{brand.logoUrl ? "Trocar logo" : "Adicionar logo"}</p>
                <p className="text-xs text-gray-400">PNG, JPG até 2MB</p>
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>

          {/* Assinatura */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Seu nome / assinatura</label>
            <input
              type="text"
              value={brand.signature ?? ""}
              onChange={e => setBrand(b => ({ ...b, signature: e.target.value }))}
              placeholder="Ex: Suhelen Silva · Tarot Terapêutico"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>

          {/* Slogan */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Slogan / tagline</label>
            <input
              type="text"
              value={brand.slogan ?? ""}
              onChange={e => setBrand(b => ({ ...b, slogan: e.target.value }))}
              placeholder="Ex: Iluminando caminhos com as cartas"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>

          {/* Cores */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Destaque</label>
              <div className="flex items-center gap-2">
                <input type="color" value={accent} onChange={e => setBrand(b => ({ ...b, reportAccentColor: e.target.value }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <span className="text-xs text-gray-500 font-mono">{accent}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Fundo</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bg} onChange={e => setBrand(b => ({ ...b, reportBg: e.target.value }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <span className="text-xs text-gray-500 font-mono">{bg}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Texto</label>
              <div className="flex items-center gap-2">
                <input type="color" value={text} onChange={e => setBrand(b => ({ ...b, reportTextColor: e.target.value }))}
                  className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <span className="text-xs text-gray-500 font-mono">{text}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Prévia do cabeçalho</p>
          <div
            className="rounded-xl p-5 border"
            style={{ backgroundColor: bg, borderColor: accent + "40" }}
          >
            <div className="flex items-center gap-3 mb-3">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt="logo" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
              ) : (
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + "20" }}>
                  <span className="text-2xl">🔮</span>
                </div>
              )}
              <div>
                <p className="font-bold text-base" style={{ color: text }}>
                  {brand.signature || "Sua Assinatura"}
                </p>
                {brand.slogan && (
                  <p className="text-xs mt-0.5" style={{ color: accent }}>
                    {brand.slogan}
                  </p>
                )}
              </div>
            </div>
            <div className="h-px mb-3" style={{ backgroundColor: accent + "30" }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>
              Relatório de Atendimento
            </p>
            <p className="text-xs mt-1" style={{ color: text + "80" }}>
              Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RelatoriosPage() {
  const [data, setData] = useState<{
    monthlyRevenue: MonthData[]
    clientStats: ClientStat[]
    cancelReasons: CancelReason[]
    statusCounts: StatusCount[]
  } | null>(null)

  useEffect(() => {
    fetch("/api/relatorios").then((r) => r.json()).then(setData)
  }, [])

  if (!data) return (
    <PlanGate feature="relatorios" message="Relatórios e métricas estão disponíveis a partir do plano Pró.">
      <div className="p-8 text-gray-400">Carregando...</div>
    </PlanGate>
  )

  const maxRevenue = Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1)
  const totalRevenue = data.monthlyRevenue.reduce((s, m) => s + m.revenue, 0)
  const totalSessions = data.statusCounts.find((s) => s.status === "COMPLETED")?._count ?? 0
  const totalNoShow = data.statusCounts.find((s) => s.status === "NO_SHOW")?._count ?? 0

  return (
    <PlanGate feature="relatorios" message="Relatórios e métricas estão disponíveis a partir do plano Pró.">
      <div className="p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>

        {/* Seção de marca — só visível (desbloqueada) para Premium */}
        <BrandSection />

        {/* Cards resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-50 text-green-600 w-9 h-9 rounded-lg flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <span className="text-sm text-gray-500">Faturamento (6 meses)</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-50 text-purple-600 w-9 h-9 rounded-lg flex items-center justify-center">
                <BarChart2 size={18} />
              </div>
              <span className="text-sm text-gray-500">Sessões realizadas</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-50 text-red-600 w-9 h-9 rounded-lg flex items-center justify-center">
                <XCircle size={18} />
              </div>
              <span className="text-sm text-gray-500">Faltas</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalNoShow}</p>
          </div>
        </div>

        {/* Faturamento mensal */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Faturamento mensal</h2>
          <div className="space-y-3">
            {data.monthlyRevenue.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-24 shrink-0">{m.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-28 text-right">{formatCurrency(m.revenue)}</span>
                <span className="text-xs text-gray-400 w-16 text-right">{m.count} sess.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status geral */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Situação dos agendamentos</h2>
            <div className="space-y-3">
              {data.statusCounts.map((s) => (
                <div key={s.status} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColor[s.status] ?? "bg-gray-300"}`} />
                  <span className="text-sm text-gray-600 flex-1">{statusLabel[s.status] ?? s.status}</span>
                  <span className="text-sm font-semibold text-gray-900">{s._count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Motivos de cancelamento */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Motivos de cancelamento</h2>
            {data.cancelReasons.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum cancelamento com motivo registrado</p>
            ) : (
              <div className="space-y-2">
                {data.cancelReasons.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate">{r.cancellationReason ?? "Sem motivo"}</span>
                    <span className="font-semibold text-gray-900 ml-2 shrink-0">{r._count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top clientes */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Clientes — histórico</h2>
          </div>
          {data.clientStats.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum dado ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-400 font-medium">Cliente</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Sessões</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Total investido</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clientStats.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 font-medium text-gray-900">{c.name}</td>
                      <td className="py-2.5 text-right text-gray-600">{c.totalSessions}</td>
                      <td className="py-2.5 text-right font-semibold text-gray-900">{formatCurrency(c.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PlanGate>
  )
}
