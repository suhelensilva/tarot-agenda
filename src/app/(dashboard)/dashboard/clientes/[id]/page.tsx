"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Phone, Mail, Calendar, Edit2, Trash2, X,
} from "lucide-react"
import { formatPhone, formatDate, formatCurrency } from "@/lib/utils"
import { type FichaProfile } from "@/components/ficha-preview"
import ClientFichasView from "@/components/client-fichas-view"

// ─── Types ────────────────────────────────────────────────────────────────────

type Service = { id: string; name: string; price: number; active: boolean }

type Appointment = {
  id: string
  title: string | null
  startTime: string
  endTime: string
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED"
  notes: string | null
  amountPaid: number | null
  service: { id: string; name: string; price: number } | null
}

type ClientDetail = {
  id: string
  name: string
  phone: string
  email: string | null
  birthDate: string | null
  notes: string | null
  createdAt: string
  appointments: Appointment[]
}

type FormData = {
  name: string
  phone: string
  email: string
  birthDate: string
  notes: string
}

type TabPerfil = "dados" | "fichas" | "atendimentos"

const emptyForm: FormData = { name: "", phone: "", email: "", birthDate: "", notes: "" }

// ─── Status badge helper ──────────────────────────────────────────────────────

const STATUS_CONFIG = {
  SCHEDULED: { label: "Agendado", cls: "bg-gray-100 text-gray-600" },
  CONFIRMED: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Concluído", cls: "bg-green-100 text-green-700" },
  NO_SHOW: { label: "Faltou", cls: "bg-orange-100 text-orange-700" },
  CANCELLED: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
} as const

// ─── Age calc ─────────────────────────────────────────────────────────────────

function calcAge(birthDate: string): number {
  const bd = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - bd.getFullYear()
  const m = today.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--
  return age
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClienteDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loadingClient, setLoadingClient] = useState(true)

  const [services, setServices] = useState<Service[]>([])
  const [profile, setProfile] = useState<FichaProfile>({ logoUrl: null, reportBg: null, signature: null, slogan: null, reportTitleFont: null, reportTitleColor: null, reportSignatureFont: null, reportSignatureColor: null, reportFont: null, reportTextColor: null, reportAccentColor: null })
  const [fichasCounts, setFichasCounts] = useState<{ internal: number; reports: number } | null>(null)
  const handleFichasCount = useCallback((i: number, r: number) => {
    setFichasCounts({ internal: i, reports: r })
  }, [])

  const [tab, setTab] = useState<TabPerfil>("dados")

  // Edit modal
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  // ── Fetch client ──────────────────────────────────────────────────────────

  const fetchClient = useCallback(async () => {
    setLoadingClient(true)
    try {
      const res = await fetch(`/api/clientes/${id}`)
      const data = await res.json()
      setClient(data)
    } catch (e) {
      console.error("fetchClient error:", e)
    } finally {
      setLoadingClient(false)
    }
  }, [id])

  useEffect(() => { fetchClient() }, [fetchClient])

  // ── Fetch services + profile ──────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/fichas?clientId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d)) return
        setFichasCounts({
          internal: d.filter((f: { type: string }) => f.type === "INTERNAL").length,
          reports: d.filter((f: { type: string }) => f.type === "REPORT").length,
        })
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    fetch("/api/servicos").then((r) => r.json()).then((d) => setServices(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/perfil").then((r) => r.json()).then((d) => {
      if (!d || d.error) return
      setProfile({
        logoUrl: d.logoUrl ?? null,
        reportBg: d.reportBg ?? null,
        signature: d.signature ?? null,
        slogan: d.slogan ?? null,
        reportTitleFont: d.reportTitleFont ?? null,
        reportTitleColor: d.reportTitleColor ?? null,
        reportSignatureFont: d.reportSignatureFont ?? null,
        reportSignatureColor: d.reportSignatureColor ?? null,
        reportFont: d.reportFont ?? null,
        reportTextColor: d.reportTextColor ?? null,
        reportAccentColor: d.reportAccentColor ?? null,
      })
    }).catch(() => {})
  }, [])

  // ── Edit ──────────────────────────────────────────────────────────────────

  function openEdit() {
    if (!client) return
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email ?? "",
      birthDate: client.birthDate ? client.birthDate.slice(0, 10) : "",
      notes: client.notes ?? "",
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      setShowForm(false)
      fetchClient()
    } catch (e) {
      console.error("handleSave error:", e)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!confirm("Tem certeza que quer remover este cliente? Todos os dados associados serão excluídos.")) return
    try {
      await fetch(`/api/clientes/${id}`, { method: "DELETE" })
      router.push("/dashboard/clientes")
    } catch (e) {
      console.error("handleDelete error:", e)
    }
  }

  // ── Sorted data ───────────────────────────────────────────────────────────

  const sortedAppointments = client
    ? [...client.appointments].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    : []

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingClient) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Carregando...
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-gray-500">Cliente não encontrada.</p>
        <button
          onClick={() => router.push("/dashboard/clientes")}
          className="text-purple-600 hover:underline text-sm"
        >
          Voltar para Clientes
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Back button */}
      <div className="px-8 pt-6 pb-0 shrink-0">
        <button
          onClick={() => router.push("/dashboard/clientes")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors mb-6"
        >
          <ArrowLeft size={15} /> Clientes
        </button>
      </div>

      {/* Header */}
      <div className="px-8 pb-0 shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-2xl shrink-0">
              {client.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {client.birthDate && (
                  <span>{calcAge(client.birthDate)} anos · {formatDate(client.birthDate)} · </span>
                )}
                <span>{formatPhone(client.phone)}</span>
                {client.email && <span> · {client.email}</span>}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-purple-600 border border-gray-200 hover:border-purple-300 rounded-lg px-3 py-2 transition-colors"
            >
              <Edit2 size={14} /> Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 rounded-lg px-3 py-2 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200">
          {(["dados", "fichas", "atendimentos"] as const).map((t) => {
            const labels: Record<TabPerfil, string> = {
              dados: "Dados",
              fichas: "Fichas & Relatórios",
              atendimentos: "Atendimentos",
            }
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === t ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {labels[t]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {/* ── Tab: Dados ── */}
        {tab === "dados" && (
          <div className="max-w-lg space-y-5">

            {/* Contact card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone size={15} className="text-gray-400 shrink-0" />
                <span className="text-gray-700">{formatPhone(client.phone)}</span>
                <a
                  href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-green-600 hover:text-green-500 font-medium border border-green-200 hover:border-green-400 rounded-md px-2 py-0.5 transition-colors"
                >
                  WhatsApp
                </a>
              </div>
              {client.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={15} className="text-gray-400 shrink-0" />
                  <span className="text-gray-700">{client.email}</span>
                </div>
              )}
              {client.birthDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={15} className="text-gray-400 shrink-0" />
                  <span className="text-gray-700">{formatDate(client.birthDate)}</span>
                  <span className="text-gray-400 text-xs ml-1">({calcAge(client.birthDate)} anos)</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs text-amber-600 mb-1.5 font-semibold uppercase tracking-wide">Observações</p>
                <p className="text-sm text-gray-700 leading-relaxed">{client.notes}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-purple-700">{client.appointments.length}</p>
                <p className="text-xs text-purple-500 mt-1">Atendimentos</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700">
                  {fichasCounts ? `${fichasCounts.internal}/${fichasCounts.reports}` : "–"}
                </p>
                <p className="text-xs text-indigo-500 mt-1">Fichas / Relatórios</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mt-1">Cadastrada em</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{formatDate(client.createdAt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Fichas & Relatórios ── */}
        {tab === "fichas" && (
          <ClientFichasView
            clientId={id}
            clientName={client.name}
            clientBirthDate={client.birthDate}
            services={services}
            profile={profile}
            onCountChange={handleFichasCount}
          />
        )}

        {/* ── Tab: Atendimentos ── */}
        {tab === "atendimentos" && (
          <div className="max-w-2xl">
            {sortedAppointments.length === 0 ? (
              <div className="text-center py-16">
                <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Nenhum atendimento registrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedAppointments.map((a) => {
                  const start = new Date(a.startTime)
                  const end = new Date(a.endTime)
                  const status = STATUS_CONFIG[a.status]
                  return (
                    <div key={a.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="shrink-0 text-center min-w-[56px]">
                        <p className="text-sm font-bold text-gray-900">{start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
                        <p className="text-xs text-gray-400">{start.getFullYear()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {a.title ?? a.service?.name ?? "Atendimento"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                          {status.label}
                        </span>
                        {a.amountPaid != null && a.amountPaid > 0 && (
                          <span className="text-xs text-green-600 font-medium">{formatCurrency(a.amountPaid)}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Editar cliente</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  placeholder="Anotações sobre a cliente..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
