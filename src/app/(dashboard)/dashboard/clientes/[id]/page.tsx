"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Phone, Mail, Calendar, Edit2, Trash2, X, MessageCircle, Link2, Send,
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
type PaymentLink = { id: string; name: string; url: string }
type LoyaltyCard = { slot: number; imageUrl: string }

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

  // WhatsApp modal
  const [showWhatsModal, setShowWhatsModal] = useState(false)
  const [whatsMode, setWhatsMode] = useState<"free" | "payment" | "loyalty">("free")
  const [whatsMsg, setWhatsMsg] = useState("")
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([])
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null)
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([])
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null)

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

  // ── WhatsApp modal ────────────────────────────────────────────────────────

  function openWhatsModal() {
    setWhatsMode("free")
    setWhatsMsg("")
    setSelectedLink(null)
    setSelectedCard(null)
    setShowWhatsModal(true)
    fetch("/api/links-pagamento")
      .then((r) => r.json())
      .then((d) => setPaymentLinks(Array.isArray(d) ? d : []))
      .catch(() => {})
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((d) => setLoyaltyCards(Array.isArray(d.loyaltyCards) ? d.loyaltyCards : []))
      .catch(() => {})
  }

  function sendWhatsApp() {
    if (!client) return
    const phone = client.phone.replace(/\D/g, "")
    let text = whatsMsg.trim()
    if (whatsMode === "payment" && selectedLink) {
      text = text ? `${text}\n\n${selectedLink.url}` : selectedLink.url
    }
    if (whatsMode === "loyalty" && selectedCard) {
      // Abre WhatsApp com mensagem; a imagem é baixada separadamente
      const sessionText = `Sessão ${selectedCard.slot} registrada! 🌟`
      text = text ? `${text}\n\n${sessionText}` : sessionText
      // Dispara o download da imagem do cartão
      const a = document.createElement("a")
      a.href = selectedCard.imageUrl
      a.download = `cartao-fidelidade-sessao-${selectedCard.slot}.jpg`
      a.click()
    }
    const url = `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`
    window.open(url, "_blank")
    setShowWhatsModal(false)
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
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-[#aa55f9] transition-colors mb-6"
        >
          <ArrowLeft size={15} /> Clientes
        </button>
      </div>

      {/* Header */}
      <div className="px-8 pb-0 shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-[rgba(170,85,249,0.15)] flex items-center justify-center text-purple-700 dark:text-[#aa55f9] font-bold text-2xl shrink-0">
              {client.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
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
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-[#aa55f9] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] hover:border-purple-300 dark:hover:border-[rgba(170,85,249,0.3)] rounded-lg px-3 py-2 transition-colors"
            >
              <Edit2 size={14} /> Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 border border-red-100 dark:border-red-500/20 hover:border-red-300 rounded-lg px-3 py-2 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 dark:border-[rgba(170,85,249,0.12)]">
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
                  tab === t ? "border-purple-600 text-purple-700 dark:border-[#aa55f9] dark:text-[#aa55f9]" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
            <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone size={15} className="text-gray-400 shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{formatPhone(client.phone)}</span>
                <button
                  onClick={openWhatsModal}
                  className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-500 font-medium border border-green-200 dark:border-green-500/30 hover:border-green-400 rounded-md px-2 py-0.5 transition-colors"
                >
                  <MessageCircle size={12} /> WhatsApp
                </button>
              </div>
              {client.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={15} className="text-gray-400 shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{client.email}</span>
                </div>
              )}
              {client.birthDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={15} className="text-gray-400 shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{formatDate(client.birthDate)}</span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">({calcAge(client.birthDate)} anos)</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="bg-amber-50 dark:bg-[rgba(251,191,36,0.08)] border border-amber-100 dark:border-[rgba(251,191,36,0.2)] rounded-xl p-4">
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1.5 font-semibold uppercase tracking-wide">Observações</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{client.notes}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-purple-50 dark:bg-[rgba(170,85,249,0.1)] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-purple-700 dark:text-[#aa55f9]">{client.appointments.length}</p>
                <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">Atendimentos</p>
              </div>
              <div className="bg-indigo-50 dark:bg-[rgba(99,102,241,0.1)] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                  {fichasCounts ? `${fichasCounts.internal}/${fichasCounts.reports}` : "–"}
                </p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">Fichas / Relatórios</p>
              </div>
              <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cadastrada em</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">{formatDate(client.createdAt)}</p>
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
                    <div key={a.id} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-[rgba(170,85,249,0.12)] rounded-xl bg-white dark:bg-[#13131f]">
                      <div className="shrink-0 text-center min-w-[56px]">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{start.getFullYear()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {a.title ?? a.service?.name ?? "Atendimento"}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">{formatCurrency(a.amountPaid)}</span>
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
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#13131f] dark:border dark:border-[rgba(170,85,249,0.15)] rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[rgba(170,85,249,0.1)]">
              <h2 className="font-semibold text-gray-900 dark:text-white">Editar cliente</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone / WhatsApp *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                  placeholder="opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de nascimento</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] resize-none"
                  placeholder="Anotações sobre a cliente..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
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

      {/* ── WhatsApp modal ── */}
      {showWhatsModal && client && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#13131f] dark:border dark:border-[rgba(170,85,249,0.15)] rounded-2xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[rgba(170,85,249,0.1)]">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-green-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Enviar WhatsApp</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">— {client.name}</span>
              </div>
              <button onClick={() => setShowWhatsModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Tipo de mensagem */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">O que vai enviar?</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { mode: "free",    icon: <MessageCircle size={14} />, label: "Mensagem", color: "purple" },
                    { mode: "payment", icon: <Link2 size={14} />,         label: "Pagamento", color: "green" },
                    { mode: "loyalty", icon: <span className="text-sm">🎁</span>, label: "Fidelidade", color: "amber" },
                  ] as const).map(({ mode, icon, label, color }) => (
                    <button
                      key={mode}
                      onClick={() => { setWhatsMode(mode); setSelectedLink(null); setSelectedCard(null) }}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                        whatsMode === mode
                          ? color === "green"  ? "bg-green-50 dark:bg-green-500/10 border-green-400 text-green-700 dark:text-green-400"
                          : color === "amber"  ? "bg-amber-50 dark:bg-amber-500/10 border-amber-400 text-amber-700 dark:text-amber-400"
                          :                     "bg-purple-50 dark:bg-purple-500/10 border-purple-400 text-purple-700 dark:text-purple-400"
                          : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-500 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selecionar link de pagamento */}
              {whatsMode === "payment" && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Selecionar link</p>
                  {paymentLinks.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                      Nenhum link cadastrado.{" "}
                      <a href="/dashboard/configuracoes" target="_blank" className="text-purple-500 underline">Cadastrar em Configurações</a>
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {paymentLinks.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setSelectedLink(selectedLink?.id === l.id ? null : l)}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                            selectedLink?.id === l.id
                              ? "bg-green-50 dark:bg-green-500/10 border-green-400 text-green-700 dark:text-green-300"
                              : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] hover:border-green-300 dark:hover:border-green-500/40"
                          }`}
                        >
                          <Link2 size={14} className={selectedLink?.id === l.id ? "text-green-500" : "text-gray-400"} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{l.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{l.url}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cartão Fidelidade */}
              {whatsMode === "loyalty" && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Selecionar sessão</p>
                  {loyaltyCards.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                      Nenhum cartão cadastrado.{" "}
                      <a href="/dashboard/configuracoes" target="_blank" className="text-purple-500 underline">Cadastrar em Configurações</a>
                    </p>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {loyaltyCards.map((card) => (
                        <button
                          key={card.slot}
                          onClick={() => setSelectedCard(selectedCard?.slot === card.slot ? null : card)}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            selectedCard?.slot === card.slot
                              ? "border-amber-400 shadow-lg scale-105"
                              : "border-transparent hover:border-amber-300"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={card.imageUrl} alt={`Sessão ${card.slot}`} className="w-full aspect-square object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] font-bold text-center py-0.5">
                            Sessão {card.slot}
                          </span>
                          {selectedCard?.slot === card.slot && (
                            <span className="absolute top-1 right-1 bg-amber-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCard && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                      🎁 A imagem será baixada automaticamente ao clicar em enviar.
                    </p>
                  )}
                </div>
              )}

              {/* Mensagem */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {whatsMode === "payment" ? "Mensagem (opcional)" : "Mensagem"}
                </p>
                <textarea
                  rows={4}
                  value={whatsMsg}
                  onChange={(e) => setWhatsMsg(e.target.value)}
                  placeholder={
                    whatsMode === "payment"
                      ? `Olá ${client.name}! Segue o link para pagamento da sua sessão:`
                      : `Olá ${client.name}!`
                  }
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-500/40"
                />
              </div>

              {/* Preview do link que será enviado */}
              {whatsMode === "payment" && selectedLink && (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl px-3 py-2.5 text-xs text-green-700 dark:text-green-400 break-all">
                  <span className="font-semibold">Link que será enviado: </span>{selectedLink.url}
                </div>
              )}

              {/* Botão enviar */}
              <button
                onClick={sendWhatsApp}
                disabled={(whatsMode === "payment" && !selectedLink) || (whatsMode === "loyalty" && !selectedCard)}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Send size={15} /> Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
