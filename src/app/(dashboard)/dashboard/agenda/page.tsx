"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Plus, X, Clock, User, Package, Link, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Client = { id: string; name: string; phone: string }
type Service = { id: string; name: string; price: number; duration: number }
type Appointment = {
  id: string
  title: string
  startTime: string
  endTime: string
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED"
  notes: string | null
  meetingLink: string | null
  amountPaid: number | null
  cancellationReason: string | null
  client: Client
  service: Service | null
}

const statusConfig = {
  SCHEDULED:  { label: "Agendado",   color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
  CONFIRMED:  { label: "Confirmado", color: "bg-blue-100 text-blue-700",     dot: "bg-blue-400" },
  COMPLETED:  { label: "Realizado",  color: "bg-green-100 text-green-700",   dot: "bg-green-400" },
  NO_SHOW:    { label: "Faltou",     color: "bg-red-100 text-red-700",       dot: "bg-red-400" },
  CANCELLED:  { label: "Cancelado",  color: "bg-gray-100 text-gray-500",     dot: "bg-gray-300" },
}

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]

export default function AgendaPage() {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(today)
  const [selectedDay, setSelectedDay] = useState<Date | null>(today)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [saving, setSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [cancellationReason, setCancellationReason] = useState("")

  const [form, setForm] = useState({
    clientId: "",
    serviceId: "",
    title: "",
    date: "",
    startHour: "09:00",
    endHour: "10:00",
    notes: "",
    meetingLink: "",
    amountPaid: "",
  })

  const fetchAppointments = useCallback(async () => {
    const m = currentDate.getMonth() + 1
    const y = currentDate.getFullYear()
    const res = await fetch(`/api/agendamentos?month=${m}&year=${y}`)
    const data = await res.json()
    setAppointments(data)
  }, [currentDate])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClients)
    fetch("/api/servicos").then((r) => r.json()).then((d) => setServices(d.filter((s: Service & { active: boolean }) => s.active)))
  }, [])

  // Calendário
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (Date | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  function aptsForDay(d: Date) {
    return appointments.filter((a) => {
      const ad = new Date(a.startTime)
      return ad.getDate() === d.getDate() && ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear()
    })
  }

  function aptsForSelected() {
    if (!selectedDay) return []
    return aptsForDay(selectedDay)
  }

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }

  function openNew(day?: Date) {
    const d = day ?? selectedDay ?? today
    const dateStr = d.toISOString().slice(0, 10)
    setForm({ clientId: "", serviceId: "", title: "", date: dateStr, startHour: "09:00", endHour: "10:00", notes: "", meetingLink: "", amountPaid: "" })
    setSelected(null)
    setShowForm(true)
  }

  function onClientChange(clientId: string) {
    const client = clients.find((c) => c.id === clientId)
    setForm((f) => ({ ...f, clientId, title: client ? `Sessão — ${client.name}` : f.title }))
  }

  function onServiceChange(serviceId: string) {
    const service = services.find((s) => s.id === serviceId)
    if (service) {
      const [h, m] = form.startHour.split(":").map(Number)
      const end = new Date(0, 0, 0, h, m + service.duration)
      const endHour = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
      setForm((f) => ({ ...f, serviceId, endHour, amountPaid: String(service.price) }))
    } else {
      setForm((f) => ({ ...f, serviceId }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const startTime = new Date(`${form.date}T${form.startHour}:00`)
    const endTime = new Date(`${form.date}T${form.endHour}:00`)

    await fetch("/api/agendamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: form.clientId,
        serviceId: form.serviceId || undefined,
        title: form.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: form.notes || undefined,
        meetingLink: form.meetingLink || undefined,
        amountPaid: form.amountPaid ? parseFloat(form.amountPaid) : undefined,
      }),
    })

    setSaving(false)
    setShowForm(false)
    fetchAppointments()
  }

  async function updateStatus(id: string, status: Appointment["status"], extra?: { cancellationReason?: string; amountPaid?: number }) {
    if (updatingStatus) return
    setUpdatingStatus(true)
    try {
      await fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      })
      setSelected(null)
      setCancellationReason("")
      await fetchAppointments()
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este agendamento?")) return
    await fetch(`/api/agendamentos/${id}`, { method: "DELETE" })
    setSelected(null)
    fetchAppointments()
  }

  const selectedApts = aptsForSelected()

  return (
    <div className="flex h-full">
      {/* Calendário + lista do dia */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-xl font-bold text-gray-900 w-48 text-center">
              {MONTHS[month]} {year}
            </h1>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Novo agendamento
          </button>
        </div>

        {/* Grid do calendário */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="h-16 border-b border-r border-gray-50" />
              const apts = aptsForDay(day)
              const isToday = day.toDateString() === today.toDateString()
              const isSelected = selectedDay?.toDateString() === day.toDateString()
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`h-16 border-b border-r border-gray-50 p-1.5 text-left transition-colors hover:bg-purple-50 ${isSelected ? "bg-purple-50" : ""}`}
                >
                  <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? "bg-purple-600 text-white" : isSelected ? "text-purple-700" : "text-gray-700"
                  }`}>
                    {day.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {apts.slice(0, 3).map((a) => (
                      <div key={a.id} className={`w-1.5 h-1.5 rounded-full ${statusConfig[a.status].dot}`} />
                    ))}
                    {apts.length > 3 && <span className="text-xs text-gray-400">+{apts.length - 3}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Agendamentos do dia selecionado */}
        {selectedDay && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">
                {selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <button
                onClick={() => openNew(selectedDay)}
                className="text-sm text-purple-600 hover:text-purple-500 font-medium"
              >
                + Agendar neste dia
              </button>
            </div>

            {selectedApts.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum agendamento neste dia</p>
            ) : (
              <div className="space-y-2">
                {selectedApts.map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => setSelected(apt)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${
                      selected?.id === apt.id ? "border-purple-300 bg-purple-50" : "border-gray-200 bg-white hover:border-purple-200"
                    }`}
                  >
                    <div className="text-sm font-mono text-purple-700 font-bold w-12 shrink-0">
                      {new Date(apt.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{apt.client.name}</p>
                      {apt.service && <p className="text-xs text-gray-500">{apt.service.name}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusConfig[apt.status].color}`}>
                      {statusConfig[apt.status].label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Painel lateral — detalhe do agendamento */}
      {selected && (
        <div className="w-96 border-l border-gray-200 bg-white p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">Detalhes</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[selected.status].color}`}>
            {statusConfig[selected.status].label}
          </span>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User size={15} className="text-gray-400 shrink-0" />
              <span className="font-medium text-gray-900">{selected.client.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock size={15} className="text-gray-400 shrink-0" />
              <span className="text-gray-700">
                {new Date(selected.startTime).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                {" · "}
                {new Date(selected.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {new Date(selected.endTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {selected.service && (
              <div className="flex items-center gap-3 text-sm">
                <Package size={15} className="text-gray-400 shrink-0" />
                <span className="text-gray-700">{selected.service.name} · {formatCurrency(selected.service.price)}</span>
              </div>
            )}
            {selected.meetingLink && (
              <div className="flex items-center gap-3 text-sm">
                <Link size={15} className="text-gray-400 shrink-0" />
                <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline truncate">
                  Link da chamada
                </a>
              </div>
            )}
            {selected.notes && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{selected.notes}</div>
            )}
            {selected.amountPaid != null && (
              <div className="text-sm font-medium text-green-700">
                Valor pago: {formatCurrency(selected.amountPaid)}
              </div>
            )}
          </div>

          {/* Ações de status */}
          {selected.status !== "COMPLETED" && selected.status !== "CANCELLED" && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Marcar como</p>

              {selected.status !== "CONFIRMED" && (
                <button
                  onClick={() => updateStatus(selected.id, "CONFIRMED")}
                  disabled={updatingStatus}
                  className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={15} /> Confirmado
                </button>
              )}

              <button
                onClick={() => updateStatus(selected.id, "COMPLETED")}
                disabled={updatingStatus}
                className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={15} /> {updatingStatus ? "Salvando..." : "Realizado"}
              </button>

              <button
                onClick={() => updateStatus(selected.id, "NO_SHOW")}
                disabled={updatingStatus}
                className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={15} /> Faltou
              </button>

              <div className="pt-1">
                <input
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Motivo do cancelamento (opcional)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <button
                  onClick={() => updateStatus(selected.id, "CANCELLED", { cancellationReason: cancellationReason || undefined })}
                  disabled={updatingStatus}
                  className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertCircle size={15} /> Cancelado
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => handleDelete(selected.id)}
            className="w-full mt-4 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            Remover agendamento
          </button>
        </div>
      )}

      {/* Modal novo agendamento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Novo agendamento</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  required
                  value={form.clientId}
                  onChange={(e) => onClientChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">Selecione a cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                <select
                  value={form.serviceId}
                  onChange={(e) => onServiceChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">Sem serviço específico</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.price)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: Leitura de Amor"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Início *</label>
                  <input
                    required
                    type="time"
                    value={form.startHour}
                    onChange={(e) => setForm({ ...form, startHour: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fim *</label>
                  <input
                    required
                    type="time"
                    value={form.endHour}
                    onChange={(e) => setForm({ ...form, endHour: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link da chamada</label>
                <input
                  type="url"
                  value={form.meetingLink}
                  onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="https://meet.google.com/... (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  placeholder="opcional"
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
                  {saving ? "Salvando..." : "Agendar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
