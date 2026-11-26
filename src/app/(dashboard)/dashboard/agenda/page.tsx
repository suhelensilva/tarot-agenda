"use client"

import { activeServicesAZ } from "@/lib/service-order"
import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, Plus, X, Clock, User, Package, Link, CheckCircle, XCircle, AlertCircle, Pencil, FileText, Lock, Coffee, Trash2, Copy } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { usePlanFetch } from "@/components/upgrade-provider"
import { ClientSearchSelect } from "@/components/client-search-select"

type Client = { id: string; name: string; phone: string; tag: string | null }
type Service = { id: string; name: string; price: number; duration: number }
type Appointment = {
  id: string
  title: string
  startTime: string
  endTime: string
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED"
  notes: string | null
  motivo: string | null
  meetingLink: string | null
  amountPaid: number | null
  paymentStatus: string | null
  deliveryFormat: string | null
  cancellationReason: string | null
  client: Client & { tag: string | null }
  service: Service | null
}

type Block = {
  id: string
  kind: "INTERVALO" | "TRANCADO"
  startTime: string
  endTime: string
  note: string | null
}

type FormMode = "agendamento" | "intervalo" | "trancar"

// Formato de entrega: fica só no agendamento (não é etiqueta da cliente)
const DELIVERY_FORMATS = ["Foto e áudio", "Vídeo gravado"]
const DELIVERY_ACTIVE = "bg-purple-100 text-purple-700 border-purple-400 dark:bg-[rgba(170,85,249,0.2)] dark:text-[#c084fc] dark:border-[rgba(170,85,249,0.5)]"

const BLOCK_INPUT = "w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600"

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m }
const fmtMin = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
/** Monta o "Das/Até" a partir do minuto de início e da duração, sem passar da meia-noite. */
const faixa = (startMin: number, duracao: number) => {
  const s = Math.min(Math.max(startMin, 0), 23 * 60 + 58)
  const e = Math.min(s + Math.max(duracao, 1), 23 * 60 + 59)
  return { startHour: fmtMin(s), endHour: fmtMin(e) }
}
/** Horário que começa 1 minuto depois de `fim` (ex.: agendamento até 14:50 → das 14:51). */
const horarioDepois = (fim: Date, duracao = 15) => faixa(fim.getHours() * 60 + fim.getMinutes() + 1, duracao)
const dayRange = (d: Date) => {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return [s, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)] as const
}
const brDay = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
}

const statusConfig = {
  SCHEDULED:  { label: "Agendado",   color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400", dot: "bg-yellow-400" },
  CONFIRMED:  { label: "Confirmado", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",         dot: "bg-blue-400" },
  COMPLETED:  { label: "Realizado",  color: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",     dot: "bg-green-400" },
  NO_SHOW:    { label: "Faltou",     color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",             dot: "bg-red-400" },
  CANCELLED:  { label: "Cancelado",  color: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",            dot: "bg-gray-300" },
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [saving, setSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [cancellationReason, setCancellationReason] = useState("")
  const [showNewClient, setShowNewClient] = useState(false)
  const [showPerson2, setShowPerson2] = useState(false)
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", birthDate: "", person2Name: "", person2BirthDate: "", tag: "" })
  const [savingClient, setSavingClient] = useState(false)
  const [newClientError, setNewClientError] = useState<string | null>(null)
  const [clientTag, setClientTag] = useState<string>("")
  // Etiquetas = listas do Kanban (fonte única). Sem a lista interna de blacklist.
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([])
  useEffect(() => {
    fetch("/api/etiquetas")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: { id: string; name: string; color: string }[]) => setLabels(d.filter((l) => l.name !== "__blacklist__")))
  }, [])
  const [savingTag, setSavingTag] = useState(false)
  const [paymentStatusInput, setPaymentStatusInput] = useState<string>("")
  const [savingPayment, setSavingPayment] = useState(false)
  const [showCustomPayment, setShowCustomPayment] = useState(false)
  const [clientLabels, setClientLabels] = useState<{ id: string; name: string; color: string }[]>([])
  const planFetch = usePlanFetch()

  const PAYMENT_PRESETS = ["Pago", "Pendente", "A combinar"]
  const paymentStatusConfig: Record<string, string> = {
    "Pago":        "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
    "Pendente":    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    "A combinar":  "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-gray-400",
  }

  const TAG_COLORS: Record<string, string> = {
    "Compradora":  "bg-green-100 text-green-700 border-green-400 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50",
    "Paga-pouco":  "bg-pink-100 text-pink-700 border-pink-400 dark:bg-pink-500/20 dark:text-pink-400 dark:border-pink-500/50",
    "Cliente R$5": "bg-red-100 text-red-700 border-red-400 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/50",
  }

  const [form, setForm] = useState({
    clientId: "",
    serviceId: "",
    title: "",
    date: "",
    startHour: "09:00",
    endHour: "10:00",
    motivo: "",
    perguntas: "",
    person2Name: "",
    person2BirthDate: "",
    notes: "",
    meetingLink: "",
    amountPaid: "",
    paymentStatus: "",
    deliveryFormat: "",
  })
  const [showPerson2Apt, setShowPerson2Apt] = useState(false)

  // Intervalos e dias trancados
  const [blocks, setBlocks] = useState<Block[]>([])
  const [formMode, setFormMode] = useState<FormMode>("agendamento")
  const [blockForm, setBlockForm] = useState({ date: "", startHour: "12:00", endHour: "13:00", note: "", days: [] as string[], extraDay: "" })
  const [blockError, setBlockError] = useState<string | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [duplicatingBlock, setDuplicatingBlock] = useState(false)
  const perguntasLoadedFor = useRef<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    const m = currentDate.getMonth() + 1
    const y = currentDate.getFullYear()
    const from = new Date(y, m - 1, 1).toISOString()
    const to = new Date(y, m, 1).toISOString()
    const [res, resBlocks] = await Promise.all([
      fetch(`/api/agendamentos?month=${m}&year=${y}`),
      fetch(`/api/bloqueios?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    ])
    const data = await res.json()
    setAppointments(data)
    const b = await resBlocks.json().catch(() => [])
    setBlocks(Array.isArray(b) ? b : [])
  }, [currentDate])

  function blocksForDay(d: Date) {
    const [s, e] = dayRange(d)
    return blocks.filter((b) => new Date(b.startTime) < e && new Date(b.endTime) > s)
  }

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClients)
    fetch("/api/servicos").then((r) => r.json()).then((d) => setServices(
      Array.isArray(d) ? activeServicesAZ(d as (Service & { active: boolean })[]) : []
    ))
  }, [])

  useEffect(() => {
    if (!selected) { setClientLabels([]); return }
    fetch(`/api/clientes/${selected.client.id}/etiquetas`)
      .then((r) => r.json())
      .then((d) => setClientLabels(Array.isArray(d) ? d.filter((l: { name: string }) => l.name !== "__blacklist__") : []))
      .catch(() => setClientLabels([]))
  }, [selected?.client.id])

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

  function toLocalDateStr(d: Date) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }

  /**
   * Início sugerido (em minutos do dia) pra um agendamento ou intervalo novo no dia `ymd`:
   * - 1 minuto depois do fim do último agendamento ou intervalo do dia (o que terminar mais tarde);
   * - se o dia é hoje e esse horário já passou (ou o dia está vazio), vale a hora do relógio;
   * - dia vazio que não é hoje: null (fica o horário padrão).
   */
  function inicioSugerido(ymd: string): number | null {
    if (!ymd) return null
    const [y, m, dd] = ymd.split("-").map(Number)
    const d = new Date(y, m - 1, dd)
    const [dayStart, dayEnd] = dayRange(d)
    const ends = [
      ...aptsForDay(d).filter((a) => a.status !== "CANCELLED").map((a) => new Date(a.endTime)),
      ...blocksForDay(d).filter((b) => b.kind === "INTERVALO").map((b) => new Date(b.endTime)),
    ].filter((t) => t > dayStart && t < dayEnd)
    const ultimo = ends.length > 0 ? new Date(Math.max(...ends.map((t) => t.getTime()))) : null
    const depoisDoUltimo = ultimo ? ultimo.getHours() * 60 + ultimo.getMinutes() + 1 : null
    const agora = new Date()
    if (d.toDateString() === agora.toDateString()) {
      return Math.max(depoisDoUltimo ?? 0, agora.getHours() * 60 + agora.getMinutes())
    }
    return depoisDoUltimo
  }

  function sugestaoIntervalo(ymd: string, duracao = 15) {
    const ini = inicioSugerido(ymd)
    return ini === null ? null : faixa(ini, duracao)
  }

  /** `depoisDe`: fim do agendamento escolhido; o intervalo começa 1 minuto depois dele. */
  function openNew(day?: Date, mode: FormMode = "agendamento", depoisDe?: Date) {
    const d = day ?? selectedDay ?? today
    const dateStr = toLocalDateStr(d)

    // Agendamento novo: 1 minuto depois do último agendamento/intervalo do dia, ou a hora atual se já passou.
    const ini = inicioSugerido(dateStr)
    const { startHour, endHour } = ini === null ? { startHour: "09:00", endHour: "10:00" } : faixa(ini, 60)

    setForm({ clientId: "", serviceId: "", title: "", date: dateStr, startHour, endHour, motivo: "", perguntas: "", person2Name: "", person2BirthDate: "", notes: "", meetingLink: "", amountPaid: "", paymentStatus: "", deliveryFormat: "" })
    setEditingId(null)
    setSelected(null)
    setShowNewClient(false)
    setShowPerson2(false)
    setShowPerson2Apt(false)
    setNewClient({ name: "", phone: "", email: "", birthDate: "", person2Name: "", person2BirthDate: "", tag: "" })
    setNewClientError(null)
    setClientTag("")
    setFormMode(mode)
    setEditingBlockId(null)
    setDuplicatingBlock(false)
    // Intervalo novo começa 1 minuto depois do fim do agendamento escolhido
    // (ou do último agendamento/intervalo do dia). Calcula sempre, pra valer também
    // quando ela troca pra aba "Intervalo" dentro do formulário.
    const sugestao = depoisDe ? horarioDepois(depoisDe) : sugestaoIntervalo(dateStr)
    setBlockForm({ date: dateStr, startHour: sugestao?.startHour ?? "12:00", endHour: sugestao?.endHour ?? "13:00", note: "", days: [dateStr], extraDay: "" })
    setBlockError(null)
    setShowForm(true)
  }

  function openEditBlock(b: Block) {
    const s = new Date(b.startTime)
    setEditingId(null)
    setSelected(null)
    setFormMode("intervalo")
    setEditingBlockId(b.id)
    setDuplicatingBlock(false)
    setBlockForm({ date: toLocalDateStr(s), startHour: hhmm(s), endHour: hhmm(new Date(b.endTime)), note: b.note ?? "", days: [], extraDay: "" })
    setBlockError(null)
    setShowForm(true)
  }

  /** Abre um intervalo novo já com a mesma duração e observação do intervalo escolhido. */
  function openDuplicateBlock(b: Block) {
    openEditBlock(b)
    setEditingBlockId(null)
    setDuplicatingBlock(true)
  }

  /** Muda o "Das" mantendo a duração do intervalo (o "Até" anda junto). */
  function changeBlockStart(value: string) {
    setBlockForm((f) => {
      const dur = toMin(f.endHour) - toMin(f.startHour)
      if (!value || dur <= 0) return { ...f, startHour: value }
      const end = Math.min(toMin(value) + dur, 23 * 60 + 59)
      return { ...f, startHour: value, endHour: fmtMin(end) }
    })
  }

  /** Troca o dia do intervalo novo e refaz o início pra 1 minuto depois do último horário desse dia (a duração continua). */
  function changeBlockDate(value: string) {
    setBlockForm((f) => {
      if (editingBlockId || duplicatingBlock) return { ...f, date: value }
      const dur = toMin(f.endHour) - toMin(f.startHour)
      const s = sugestaoIntervalo(value, dur > 0 ? dur : 15)
      return s ? { ...f, date: value, ...s } : { ...f, date: value }
    })
  }

  async function handleSaveBlock(e: React.FormEvent) {
    e.preventDefault()
    setBlockError(null)
    let periods: { startTime: string; endTime: string }[]
    if (formMode === "intervalo") {
      if (!blockForm.date) return setBlockError("Escolha o dia.")
      const s = new Date(`${blockForm.date}T${blockForm.startHour}:00`)
      const en = new Date(`${blockForm.date}T${blockForm.endHour}:00`)
      if (en <= s) return setBlockError("O horário final precisa ser depois do inicial.")
      periods = [{ startTime: s.toISOString(), endTime: en.toISOString() }]
    } else {
      if (blockForm.days.length === 0) return setBlockError("Escolha pelo menos um dia.")
      periods = blockForm.days.map((ymd) => {
        const [y, m, d] = ymd.split("-").map(Number)
        return { startTime: new Date(y, m - 1, d).toISOString(), endTime: new Date(y, m - 1, d + 1).toISOString() }
      })
    }
    setSaving(true)
    try {
      const res = editingBlockId
        ? await fetch(`/api/bloqueios/${editingBlockId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...periods[0], note: blockForm.note || null }),
          })
        : await fetch("/api/bloqueios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: formMode === "intervalo" ? "INTERVALO" : "TRANCADO", note: blockForm.note || null, periods }),
          })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setBlockError(err.error ?? "Não deu para salvar. Tente de novo.")
        return
      }
      setShowForm(false)
      setEditingBlockId(null)
      await fetchAppointments()
    } catch {
      setBlockError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBlock(b: Block) {
    const msg = b.kind === "TRANCADO" ? "Destrancar este dia?" : "Remover este intervalo?"
    if (!confirm(msg)) return
    await fetch(`/api/bloqueios/${b.id}`, { method: "DELETE" })
    setBlocks((prev) => prev.filter((x) => x.id !== b.id))
  }

  function openEdit(apt: Appointment) {
    const start = new Date(apt.startTime)
    const end = new Date(apt.endTime)
    const dateStr = toLocalDateStr(start)
    const startHour = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
    const endHour = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
    setForm({
      clientId: apt.client.id,
      serviceId: apt.service?.id ?? "",
      title: apt.title,
      date: dateStr,
      startHour,
      endHour,
      motivo: apt.motivo ?? "",
      perguntas: "",
      person2Name: "",
      person2BirthDate: "",
      notes: apt.notes ?? "",
      meetingLink: apt.meetingLink ?? "",
      amountPaid: apt.amountPaid != null ? String(apt.amountPaid) : "",
      paymentStatus: "",
      deliveryFormat: apt.deliveryFormat ?? "",
    })
    setEditingId(apt.id)
    // Perguntas ficam na ficha: busca as do dia deste agendamento
    perguntasLoadedFor.current = null
    fetch(`/api/agendamentos/${apt.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        perguntasLoadedFor.current = apt.id
        setForm((f) => ({ ...f, perguntas: f.perguntas || d.perguntas || "" }))
      })
      .catch(() => {})
    setShowNewClient(false)
    setShowPerson2(false)
    setShowPerson2Apt(false)
    setNewClient({ name: "", phone: "", email: "", birthDate: "", person2Name: "", person2BirthDate: "", tag: "" })
    setNewClientError(null)
    setClientTag(apt.client.tag ?? "")
    setFormMode("agendamento")
    setEditingBlockId(null)
    if (!apt.client.tag) {
      fetch(`/api/clientes/${apt.client.id}/etiquetas`)
        .then((r) => r.json())
        .then((labels) => {
          const first = Array.isArray(labels) ? labels.find((l: { name: string }) => l.name !== "__blacklist__") : null
          if (first) setClientTag(first.name)
        })
        .catch(() => {})
    }
    setShowForm(true)
  }

  async function onClientChange(clientId: string) {
    setForm((f) => ({ ...f, clientId }))
    const c = clients.find((x) => x.id === clientId)
    if (c?.tag) {
      setClientTag(c.tag)
    } else if (clientId) {
      try {
        const res = await fetch(`/api/clientes/${clientId}/etiquetas`)
        const labels = await res.json()
        const first = Array.isArray(labels) ? labels.find((l: { name: string }) => l.name !== "__blacklist__") : null
        setClientTag(first?.name ?? "")
      } catch {
        setClientTag("")
      }
    } else {
      setClientTag("")
    }
  }

  async function handleClientTagChange(newTag: string) {
    if (!form.clientId) return
    setSavingTag(true)
    try {
      const c = clients.find((x) => x.id === form.clientId)
      if (!c) return
      await fetch(`/api/clientes/${form.clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: c.name, phone: c.phone, tag: newTag || undefined }),
      })
      setClientTag(newTag)
      setClients((prev) => prev.map((x) => x.id === form.clientId ? { ...x, tag: newTag || null } : x))
    } finally {
      setSavingTag(false)
    }
  }

  function calcEndHour(startHour: string, duration: number): string {
    const [h, m] = startHour.split(":").map(Number)
    const end = new Date(0, 0, 0, h, m + duration)
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
  }

  function onServiceChange(serviceId: string) {
    const service = services.find((s) => s.id === serviceId)
    if (service) {
      setForm((f) => ({
        ...f,
        serviceId,
        endHour: service.duration > 0 ? calcEndHour(f.startHour, service.duration) : f.endHour,
        title: `Agendamento ${service.name}`,
        amountPaid: service.price > 0 ? String(service.price) : "",
      }))
    } else {
      setForm((f) => ({ ...f, serviceId, title: "", amountPaid: "" }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const startTime = new Date(`${form.date}T${form.startHour}:00`)
    const endTime = new Date(`${form.date}T${form.endHour}:00`)

    // Avisa se o horário cai num intervalo ou num dia trancado
    try {
      const r = await fetch(`/api/bloqueios?from=${encodeURIComponent(startTime.toISOString())}&to=${encodeURIComponent(endTime.toISOString())}`)
      const hits: Block[] = r.ok ? await r.json() : []
      if (hits.length > 0) {
        const b = hits[0]
        const what = b.kind === "TRANCADO"
          ? "Esse dia está trancado na agenda"
          : `Esse horário cai no intervalo das ${hhmm(new Date(b.startTime))} às ${hhmm(new Date(b.endTime))}`
        if (!confirm(`${what}. Agendar mesmo assim?`)) { setSaving(false); return }
      }
    } catch { /* sem conexão para checar: segue */ }

    const payload = {
      clientId: form.clientId,
      serviceId: form.serviceId || null,
      title: form.title,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      motivo: form.motivo || null,
      // Na edição, só mexe nas perguntas se elas foram carregadas (senão apagaria sem querer)
      ...(!editingId
        ? { perguntas: form.perguntas || null }
        : perguntasLoadedFor.current === editingId || form.perguntas
          ? { perguntas: form.perguntas }
          : {}),
      person2Name: form.person2Name || null,
      person2BirthDate: form.person2BirthDate || null,
      notes: form.notes || null,
      meetingLink: form.meetingLink || null,
      amountPaid: form.amountPaid !== "" ? parseFloat(form.amountPaid) : null,
      deliveryFormat: form.deliveryFormat || null,
      ...(!editingId && form.paymentStatus ? { paymentStatus: form.paymentStatus } : {}),
    }

    console.log("[agenda] handleSave payload:", JSON.stringify(payload))

    try {
      const res = editingId
        ? await fetch(`/api/agendamentos/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/agendamentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? "Erro ao salvar agendamento. Tente novamente.")
        setSaving(false)
        return
      }

      setShowForm(false)
      setEditingId(null)
      setSelected(null)
      setSelectedDay(startTime)
      await fetchAppointments()
    } catch {
      alert("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setSaving(false)
    }
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

  async function updateDeliveryFormat(id: string, value: string | null) {
    setSelected((prev) => prev ? { ...prev, deliveryFormat: value } : prev)
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, deliveryFormat: value } : a))
    await fetch(`/api/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryFormat: value }),
    })
  }

  async function updatePaymentStatus(id: string, value: string | null) {
    setSavingPayment(true)
    try {
      await fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: value }),
      })
      setSelected((prev) => prev ? { ...prev, paymentStatus: value } : prev)
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, paymentStatus: value } : a))
      setShowCustomPayment(false)
      setPaymentStatusInput("")
    } finally {
      setSavingPayment(false)
    }
  }

  async function handleCreateClient() {
    if (!newClient.name.trim()) {
      setNewClientError("Nome é obrigatório")
      return
    }
    setSavingClient(true)
    setNewClientError(null)
    try {
      const res = await planFetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClient.name.trim(),
          phone: newClient.phone.trim(),
          email: newClient.email.trim() || undefined,
          birthDate: newClient.birthDate || undefined,
          person2Name: newClient.person2Name.trim() || undefined,
          person2BirthDate: newClient.person2BirthDate || undefined,
          tag: newClient.tag || undefined,
        }),
      })
      if (!res.ok) {
        setSavingClient(false)
        return
      }
      const created: Client = await res.json()
      setClients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      onClientChange(created.id)
      setShowNewClient(false)
      setShowPerson2(false)
      setNewClient({ name: "", phone: "", email: "", birthDate: "", person2Name: "", person2BirthDate: "", tag: "" })
    } catch {
      setNewClientError("Erro ao criar cliente. Tente novamente.")
    } finally {
      setSavingClient(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este agendamento?")) return
    await fetch(`/api/agendamentos/${id}`, { method: "DELETE" })
    setSelected(null)
    fetchAppointments()
  }

  const selectedApts = aptsForSelected()
  const selectedBlocks = selectedDay ? blocksForDay(selectedDay) : []
  const selectedLocks = selectedBlocks.filter((b) => b.kind === "TRANCADO")
  const selectedBreaks = selectedBlocks.filter((b) => b.kind === "INTERVALO")

  return (
    <div className="flex h-full">
      {/* Calendário + lista do dia */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-600 dark:text-gray-400">
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white w-48 text-center">
              {MONTHS[month]} {year}
            </h1>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-600 dark:text-gray-400">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openNew()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Novo agendamento
            </button>
            <button
              onClick={() => openNew(undefined, "intervalo")}
              className="flex items-center gap-2 border border-purple-200 dark:border-[rgba(170,85,249,0.3)] text-purple-700 dark:text-[#aa55f9] hover:bg-purple-50 dark:hover:bg-[rgba(170,85,249,0.08)] px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Coffee size={16} />
              Adicionar intervalo
            </button>
          </div>
        </div>

        {/* Grid do calendário */}
        <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl overflow-hidden mb-6">
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-[rgba(170,85,249,0.08)]">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-400 dark:text-gray-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="h-16 border-b border-r border-gray-50 dark:border-[rgba(255,255,255,0.03)]" />
              const apts = aptsForDay(day)
              const dayBlocks = blocksForDay(day)
              const isLocked = dayBlocks.some((b) => b.kind === "TRANCADO")
              const hasBreak = dayBlocks.some((b) => b.kind === "INTERVALO")
              const isToday = day.toDateString() === today.toDateString()
              const isSelected = selectedDay?.toDateString() === day.toDateString()
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`relative h-16 border-b border-r border-gray-50 dark:border-[rgba(255,255,255,0.03)] p-1.5 text-left transition-colors hover:bg-purple-50 dark:hover:bg-[rgba(170,85,249,0.06)] ${isSelected ? "bg-purple-50 dark:bg-[rgba(170,85,249,0.08)]" : isLocked ? "bg-gray-100 dark:bg-white/[0.04]" : ""}`}
                >
                  {(isLocked || hasBreak) && (
                    <span className="absolute bottom-1 right-1 flex gap-0.5 text-gray-400 dark:text-gray-500">
                      {hasBreak && <Coffee size={11} />}
                      {isLocked && <Lock size={11} />}
                    </span>
                  )}
                  <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? "bg-purple-600 text-white" : isSelected ? "text-purple-700 dark:text-[#aa55f9]" : "text-gray-700 dark:text-gray-300"
                  }`}>
                    {day.getDate()}
                  </span>
                  {apts.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {apts.slice(0, 12).map((a) => (
                        <div key={a.id} className={`w-1.5 h-1.5 rounded-full ${statusConfig[a.status].dot}`} />
                      ))}
                    </div>
                  )}
                  {apts.length > 0 && (
                    <span className="absolute top-1 right-1 text-xs font-medium text-gray-400 dark:text-gray-500 leading-none">
                      {apts.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Agendamentos do dia selecionado */}
        {selectedDay && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <button
                onClick={() => openNew(selectedDay)}
                className="text-sm text-purple-600 dark:text-[#aa55f9] hover:text-purple-500 font-medium"
              >
                + Agendar neste dia
              </button>
            </div>

            {selectedLocks.map((b) => (
              <div key={b.id} className="mb-2 flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/[0.03]">
                <Lock size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Agenda trancada neste dia</span>
                  {b.note && <span className="text-gray-500 dark:text-gray-400"> · {b.note}</span>}
                </p>
                <button onClick={() => handleDeleteBlock(b)} className="text-xs text-purple-600 dark:text-[#aa55f9] hover:text-purple-500 font-medium">
                  Destrancar
                </button>
              </div>
            ))}

            {selectedApts.length === 0 && selectedBreaks.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum agendamento neste dia</p>
            ) : (
              <div className="space-y-2">
                {[
                  ...selectedBreaks.map((b) => ({ at: new Date(b.startTime).getTime(), block: b, apt: null })),
                  ...selectedApts.map((a) => ({ at: new Date(a.startTime).getTime(), block: null, apt: a })),
                ].sort((x, y) => x.at - y.at).map(({ block: b, apt }) => b ? (
                  <div key={b.id} className="mr-16 flex items-center gap-4 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/[0.03]">
                    <div className="text-sm font-mono text-gray-500 dark:text-gray-400 font-bold w-12 shrink-0">{hhmm(new Date(b.startTime))}</div>
                    <div className="flex-1 min-w-0 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Coffee size={15} className="shrink-0" />
                      <span className="truncate">
                        Intervalo até {hhmm(new Date(b.endTime))}
                        {b.note && <span className="text-gray-400 dark:text-gray-500"> · {b.note}</span>}
                      </span>
                    </div>
                    <button onClick={() => openDuplicateBlock(b)} title="Duplicar intervalo" className="text-gray-400 hover:text-purple-600 dark:hover:text-[#aa55f9] shrink-0">
                      <Copy size={15} />
                    </button>
                    <button onClick={() => openEditBlock(b)} title="Editar intervalo" className="text-gray-400 hover:text-purple-600 dark:hover:text-[#aa55f9] shrink-0">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDeleteBlock(b)} title="Remover intervalo" className="text-gray-400 hover:text-red-500 shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : apt && (
                  <div key={apt.id} className="flex items-stretch gap-2">
                  <button
                    onClick={() => setSelected(apt)}
                    className={`flex-1 min-w-0 flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${
                      selected?.id === apt.id
                        ? "border-purple-300 bg-purple-50 dark:border-[rgba(170,85,249,0.4)] dark:bg-[rgba(170,85,249,0.1)]"
                        : "border-gray-200 bg-white hover:border-purple-200 dark:border-[rgba(170,85,249,0.12)] dark:bg-[#13131f] dark:hover:border-[rgba(170,85,249,0.3)]"
                    }`}
                  >
                    <div className="text-sm font-mono text-purple-700 dark:text-[#aa55f9] font-bold w-12 shrink-0">
                      {new Date(apt.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{apt.client.name}</p>
                      {(apt.service || apt.deliveryFormat) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                          {apt.service?.name}
                          {apt.deliveryFormat && (
                            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-[rgba(170,85,249,0.15)] dark:text-[#c084fc] text-[10px] font-medium">
                              {apt.deliveryFormat}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusConfig[apt.status].color}`}>
                      {statusConfig[apt.status].label}
                    </span>
                  </button>
                  {/* Intervalo logo depois deste agendamento: começa 1 minuto após o fim */}
                  {apt.status === "CANCELLED" ? (
                    <span className="w-14 shrink-0" />
                  ) : (
                    <button
                      onClick={() => openNew(new Date(apt.startTime), "intervalo", new Date(apt.endTime))}
                      title={`Adicionar intervalo a partir das ${horarioDepois(new Date(apt.endTime)).startHour}`}
                      aria-label="Adicionar intervalo depois deste agendamento"
                      className="w-14 shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-gray-400 hover:text-purple-600 hover:border-purple-300 dark:hover:text-[#aa55f9] dark:hover:border-[rgba(170,85,249,0.4)] transition-colors"
                    >
                      <Coffee size={16} />
                      <span className="text-[10px] font-mono leading-none">{horarioDepois(new Date(apt.endTime)).startHour}</span>
                    </button>
                  )}
                  </div>
                ))}
              </div>
            )}

            {selectedApts.length > 0 && (
              <p className="mt-3 text-right text-xs text-gray-500 dark:text-gray-400">
                Total de faturamento do dia:{" "}
                <span className="font-semibold text-purple-600 dark:text-[#aa55f9]">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    selectedApts
                      .filter((a) => a.paymentStatus === "Pago")
                      .reduce((s, a) => s + (a.amountPaid ?? 0), 0)
                  )}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Painel lateral — detalhe do agendamento */}
      {selected && (
        <div className="w-96 border-l border-gray-200 dark:border-[rgba(170,85,249,0.12)] bg-white dark:bg-[#0f0f1a] p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-white">Detalhes</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[selected.status].color}`}>
              {statusConfig[selected.status].label}
            </span>
            {selected.paymentStatus && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentStatusConfig[selected.paymentStatus] ?? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"}`}>
                {selected.paymentStatus}
              </span>
            )}
            {clientLabels.map((label) => (
              <span
                key={label.id}
                className="text-xs px-2.5 py-1 rounded-full font-medium border"
                style={{
                  background: label.color + "22",
                  color: label.color,
                  borderColor: label.color + "55",
                }}
              >
                {label.name}
              </span>
            ))}
          </div>

          {/* Formato de entrega (só deste agendamento) */}
          <div className="mt-3">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wide mb-1.5">Formato de entrega</p>
            <div className="flex flex-wrap gap-1.5">
              {DELIVERY_FORMATS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => updateDeliveryFormat(selected.id, selected.deliveryFormat === opt ? null : opt)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                    selected.deliveryFormat === opt
                      ? DELIVERY_ACTIVE
                      : "border-gray-200 dark:border-[rgba(170,85,249,0.2)] text-gray-500 dark:text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Seletor de status de pagamento */}
          <div className="mt-3">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wide mb-1.5">Pagamento</p>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_PRESETS.map((opt) => (
                <button
                  key={opt}
                  disabled={savingPayment}
                  onClick={() => updatePaymentStatus(selected.id, selected.paymentStatus === opt ? null : opt)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                    selected.paymentStatus === opt
                      ? (paymentStatusConfig[opt] ?? "") + " border-current"
                      : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-500 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  {opt}
                </button>
              ))}
              <button
                onClick={() => setShowCustomPayment((v) => !v)}
                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-white/10 text-gray-400 dark:text-gray-600 hover:border-gray-400 dark:hover:border-white/20 transition-all"
              >
                + outro
              </button>
            </div>
            {showCustomPayment && (
              <div className="flex gap-1.5 mt-1.5">
                <input
                  autoFocus
                  value={paymentStatusInput}
                  onChange={(e) => setPaymentStatusInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && paymentStatusInput.trim()) {
                      updatePaymentStatus(selected.id, paymentStatusInput.trim())
                    }
                    if (e.key === "Escape") setShowCustomPayment(false)
                  }}
                  placeholder="Ex: Vai pagar dia 10"
                  className="flex-1 text-xs border border-gray-200 dark:border-white/10 dark:bg-white/5 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gray-300 dark:focus:border-white/20 dark:text-gray-200 dark:placeholder-gray-600"
                />
                <button
                  disabled={!paymentStatusInput.trim() || savingPayment}
                  onClick={() => updatePaymentStatus(selected.id, paymentStatusInput.trim())}
                  className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40"
                >
                  Ok
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User size={15} className="text-gray-400 shrink-0" />
              <span className="font-medium text-gray-900 dark:text-white">{selected.client.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock size={15} className="text-gray-400 shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">
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
                <span className="text-gray-700 dark:text-gray-300">{selected.service.name}</span>
              </div>
            )}
            {selected.meetingLink && (
              <div className="flex items-center gap-3 text-sm">
                <Link size={15} className="text-gray-400 shrink-0" />
                <a href={selected.meetingLink} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-[#aa55f9] hover:underline truncate">
                  Link da chamada
                </a>
              </div>
            )}
            {selected.motivo && (
              <div className="bg-purple-50 dark:bg-[rgba(170,85,249,0.08)] border border-purple-100 dark:border-[rgba(170,85,249,0.2)] rounded-lg p-3">
                <p className="text-xs font-semibold text-purple-600 dark:text-[#aa55f9] mb-1">Motivo</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selected.motivo}</p>
              </div>
            )}
            {selected.notes && (
              <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">{selected.notes}</div>
            )}
            {selected.amountPaid != null && (
              <div className="text-sm font-medium text-green-700 dark:text-green-400">
                Valor pago: {formatCurrency(selected.amountPaid)}
              </div>
            )}
          </div>

          {/* Ações de status */}
          {selected.status !== "COMPLETED" && selected.status !== "CANCELLED" && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Marcar como</p>

              {selected.status !== "CONFIRMED" && (
                <button
                  onClick={() => updateStatus(selected.id, "CONFIRMED")}
                  disabled={updatingStatus}
                  className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={15} /> Confirmado
                </button>
              )}

              <button
                onClick={() => updateStatus(selected.id, "COMPLETED")}
                disabled={updatingStatus}
                className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={15} /> {updatingStatus ? "Salvando..." : "Realizado"}
              </button>

              <button
                onClick={() => updateStatus(selected.id, "NO_SHOW")}
                disabled={updatingStatus}
                className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={15} /> Faltou
              </button>

              <div className="pt-1">
                <input
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Motivo do cancelamento (opcional)"
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.04)] rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[rgba(170,85,249,0.4)] dark:text-gray-200 dark:placeholder-gray-600"
                />
                <button
                  onClick={() => updateStatus(selected.id, "CANCELLED", { cancellationReason: cancellationReason || undefined })}
                  disabled={updatingStatus}
                  className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertCircle size={15} /> Cancelado
                </button>
              </div>
            </div>
          )}

          {/* Botão Editar */}
          <button
            onClick={() => openEdit(selected)}
            className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border border-purple-200 dark:border-[rgba(170,85,249,0.3)] text-purple-700 dark:text-[#aa55f9] hover:bg-purple-50 dark:hover:bg-[rgba(170,85,249,0.08)] transition-colors"
          >
            <Pencil size={14} />
            Editar agendamento
          </button>

          {/* Botão Ficha do cliente */}
          <a
            href={`/dashboard/clientes/${selected.client.id}?tab=fichas`}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border border-indigo-200 dark:border-[rgba(99,102,241,0.3)] text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-[rgba(99,102,241,0.08)] transition-colors"
          >
            <FileText size={14} />
            Abrir ficha do cliente
          </a>

          <button
            onClick={() => handleDelete(selected.id)}
            className="w-full mt-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
          >
            Remover agendamento
          </button>
        </div>
      )}

      {/* Modal novo agendamento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#13131f] rounded-2xl shadow-xl dark:border dark:border-[rgba(170,85,249,0.15)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[rgba(170,85,249,0.1)]">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {editingId ? "Editar agendamento" : editingBlockId ? "Editar intervalo" : duplicatingBlock ? "Duplicar intervalo" : formMode === "intervalo" ? "Adicionar intervalo" : formMode === "trancar" ? "Trancar agenda" : "Novo agendamento"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={18} />
              </button>
            </div>

            {!editingId && !editingBlockId && !duplicatingBlock && (
              <div className="px-6 pt-4">
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5">
                  {([
                    ["agendamento", "Agendamento", Plus],
                    ["intervalo", "Intervalo", Coffee],
                    ["trancar", "Trancar agenda", Lock],
                  ] as const).map(([mode, label, Icon]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        // Se o dia foi trocado na aba Agendamento, o intervalo acompanha esse dia
                        if (mode === "intervalo" && form.date && form.date !== blockForm.date) changeBlockDate(form.date)
                        setFormMode(mode)
                        setBlockError(null)
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        formMode === mode
                          ? "bg-white dark:bg-[#1f1f30] text-purple-700 dark:text-[#aa55f9] shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formMode === "agendamento" ? (
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cliente *</label>
                  <button
                    type="button"
                    onClick={() => { setShowNewClient((v) => !v); setNewClientError(null) }}
                    className="text-xs text-purple-600 dark:text-[#aa55f9] hover:text-purple-500 font-medium flex items-center gap-1"
                  >
                    {showNewClient ? "← Voltar" : "+ Nova cliente"}
                  </button>
                </div>

                {showNewClient ? (
                  <div className="border border-purple-200 dark:border-[rgba(170,85,249,0.25)] bg-purple-50 dark:bg-[rgba(170,85,249,0.06)] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-purple-700 dark:text-[#aa55f9]">Pré-ficha da cliente</p>

                    {/* Etiqueta (topo) */}
                    <div className="flex flex-wrap gap-1.5">
                      {labels.map((l) => l.name).map((t) => {
                        const activeStyle = t === "Compradora"
                          ? "bg-green-100 text-green-700 border-green-400 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50"
                          : t === "Paga-pouco"
                          ? "bg-pink-100 text-pink-700 border-pink-400 dark:bg-pink-500/20 dark:text-pink-400 dark:border-pink-500/50"
                          : "bg-red-100 text-red-700 border-red-400 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/50"
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewClient((p) => ({ ...p, tag: p.tag === t ? "" : t }))}
                            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                              newClient.tag === t
                                ? activeStyle
                                : "border-gray-200 dark:border-[rgba(170,85,249,0.2)] text-gray-500 dark:text-gray-400 hover:border-gray-400"
                            }`}
                          >
                            {t}
                          </button>
                        )
                      })}
                    </div>

                    {/* Linha 1: Nome + Nascimento */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome *</label>
                        <input
                          value={newClient.name}
                          onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Nome completo"
                          className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nascimento</label>
                        <input
                          type="date"
                          value={newClient.birthDate}
                          onChange={(e) => setNewClient((p) => ({ ...p, birthDate: e.target.value }))}
                          className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                        />
                      </div>
                    </div>

                    {/* Linha 2: Botão segunda pessoa */}
                    <button
                      type="button"
                      onClick={() => setShowPerson2((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-[#aa55f9] hover:text-purple-500 font-medium"
                    >
                      {showPerson2 ? "− Remover segunda pessoa" : "+ Adicionar segunda pessoa"}
                    </button>

                    {/* Segunda pessoa */}
                    {showPerson2 && (
                      <div className="grid grid-cols-2 gap-2 border-t border-purple-100 dark:border-[rgba(170,85,249,0.15)] pt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome da 2ª pessoa</label>
                          <input
                            value={newClient.person2Name}
                            onChange={(e) => setNewClient((p) => ({ ...p, person2Name: e.target.value }))}
                            placeholder="Nome completo"
                            className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nascimento da 2ª pessoa</label>
                          <input
                            type="date"
                            value={newClient.person2BirthDate}
                            onChange={(e) => setNewClient((p) => ({ ...p, person2BirthDate: e.target.value }))}
                            className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Linha 3: Telefone */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Telefone / WhatsApp <span className="text-gray-400 dark:text-gray-600">(opcional)</span></label>
                      <input
                        value={newClient.phone}
                        onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                        className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600"
                      />
                    </div>

                    {newClientError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{newClientError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleCreateClient}
                      disabled={savingClient}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {savingClient ? "Criando..." : "Criar e selecionar"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ClientSearchSelect
                      clients={clients}
                      value={form.clientId}
                      onChange={onClientChange}
                      className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[#1a1a2e] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                    />

                    {/* Etiqueta da cliente selecionada */}
                    {form.clientId && (
                      <div className="pt-0.5">
                        {clientTag ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${TAG_COLORS[clientTag] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                              {clientTag}
                            </span>
                            <button
                              type="button"
                              disabled={savingTag}
                              onClick={() => setClientTag("__choosing__")}
                              className="text-xs text-gray-400 hover:text-purple-600 dark:hover:text-[#aa55f9] transition-colors disabled:opacity-50"
                            >
                              Trocar
                            </button>
                          </div>
                        ) : clientTag === "__choosing__" ? null : (
                          <div className="flex flex-wrap gap-1.5">
                            {labels.map((l) => l.name).map((t) => (
                              <button
                                key={t}
                                type="button"
                                disabled={savingTag}
                                onClick={() => handleClientTagChange(t)}
                                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors disabled:opacity-60 border-gray-200 dark:border-[rgba(170,85,249,0.2)] text-gray-500 dark:text-gray-400 hover:border-gray-400`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                        {clientTag === "__choosing__" && (
                          <div className="flex flex-wrap gap-1.5">
                            {labels.map((l) => l.name).map((t) => (
                              <button
                                key={t}
                                type="button"
                                disabled={savingTag}
                                onClick={() => handleClientTagChange(t)}
                                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors disabled:opacity-60 border-gray-200 dark:border-[rgba(170,85,249,0.2)] text-gray-500 dark:text-gray-400 hover:border-gray-400`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Segunda pessoa */}
              <div>
                <button
                  type="button"
                  onClick={() => { setShowPerson2Apt(!showPerson2Apt); if (showPerson2Apt) setForm({ ...form, person2Name: "", person2BirthDate: "" }) }}
                  className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <span className="text-lg leading-none">{showPerson2Apt ? "−" : "+"}</span>
                  {showPerson2Apt ? "Remover pessoa adicional" : "Adicionar pessoa"}
                </button>
                {showPerson2Apt && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input
                        value={form.person2Name}
                        onChange={(e) => setForm({ ...form, person2Name: e.target.value })}
                        className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                        placeholder="Nome da pessoa"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data de nascimento (opcional)</label>
                      <input
                        type="date"
                        value={form.person2BirthDate}
                        onChange={(e) => setForm({ ...form, person2BirthDate: e.target.value })}
                        className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo do atendimento</label>
                <textarea
                  rows={2}
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600 resize-none"
                  placeholder="Por que a cliente está vindo? O que quer saber?"
                />
              </div>

              {/* Perguntas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perguntas <span className="text-gray-400 font-normal">(opcional)</span></label>
                <textarea
                  rows={3}
                  value={form.perguntas}
                  onChange={(e) => setForm({ ...form, perguntas: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600 resize-none"
                  placeholder={"1. Pergunta da cliente\n2. Pergunta da cliente"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serviço</label>
                <select
                  value={form.serviceId}
                  onChange={(e) => onServiceChange(e.target.value)}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[#1a1a2e] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                >
                  <option value="">Sem serviço específico</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600"
                  placeholder="Ex: Leitura de Amor"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => {
                      const date = e.target.value
                      setForm((f) => {
                        // Agendamento novo: ao trocar o dia, o início segue a regra do último horário desse dia (a duração continua)
                        if (editingId) return { ...f, date }
                        const dur = toMin(f.endHour) - toMin(f.startHour)
                        const ini = inicioSugerido(date)
                        return ini === null ? { ...f, date } : { ...f, date, ...faixa(ini, dur > 0 ? dur : 60) }
                      })
                    }}
                    className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início *</label>
                  <input
                    required
                    type="time"
                    value={form.startHour}
                    onChange={(e) => {
                      const startHour = e.target.value
                      setForm((f) => {
                        const service = services.find((s) => s.id === f.serviceId)
                        const endHour = service && service.duration > 0
                          ? calcEndHour(startHour, service.duration)
                          : f.endHour
                        return { ...f, startHour, endHour }
                      })
                    }}
                    className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim *</label>
                  <input
                    required
                    type="time"
                    value={form.endHour}
                    onChange={(e) => setForm({ ...form, endHour: e.target.value })}
                    className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600"
                  placeholder="0,00"
                />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pagamento</label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_PRESETS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, paymentStatus: f.paymentStatus === opt ? "" : opt }))}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                          form.paymentStatus === opt
                            ? opt === "Pago"
                              ? "bg-green-100 text-green-700 border-green-400 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50"
                              : opt === "Pendente"
                              ? "bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/50"
                              : "bg-slate-100 text-slate-600 border-slate-400 dark:bg-white/10 dark:text-gray-300 dark:border-white/20"
                            : "border-gray-200 dark:border-[rgba(170,85,249,0.2)] text-gray-500 dark:text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {form.paymentStatus && !PAYMENT_PRESETS.includes(form.paymentStatus) && (
                    <span className="mt-1.5 inline-block text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                      {form.paymentStatus}
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formato de entrega</label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_FORMATS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, deliveryFormat: f.deliveryFormat === opt ? "" : opt }))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        form.deliveryFormat === opt
                          ? DELIVERY_ACTIVE
                          : "border-gray-200 dark:border-[rgba(170,85,249,0.2)] text-gray-500 dark:text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link da chamada</label>
                <input
                  type="url"
                  value={form.meetingLink}
                  onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600"
                  placeholder="https://meet.google.com/... (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] dark:placeholder-gray-600 resize-none"
                  placeholder="opcional"
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
                  {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Agendar"}
                </button>
              </div>
            </form>
            ) : (
            <form onSubmit={handleSaveBlock} className="p-6 space-y-4">
              {formMode === "intervalo" ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Uma pausa no mesmo dia. O horário fica marcado como intervalo na agenda e não aparece no link de agendamento.
                  </p>
                  {duplicatingBlock && (
                    <p className="text-xs text-purple-700 dark:text-[#c084fc] bg-purple-50 dark:bg-[rgba(170,85,249,0.1)] rounded-lg px-3 py-2">
                      Cópia do intervalo. Escolha o dia e o horário de início: o fim acompanha e a duração continua a mesma.
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia</label>
                    <input type="date" value={blockForm.date} onChange={(e) => changeBlockDate(e.target.value)} className={BLOCK_INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Das</label>
                      <input type="time" value={blockForm.startHour} onChange={(e) => changeBlockStart(e.target.value)} className={BLOCK_INPUT} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Até</label>
                      <input type="time" value={blockForm.endHour} onChange={(e) => setBlockForm({ ...blockForm, endHour: e.target.value })} className={BLOCK_INPUT} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    O dia inteiro fica trancado: ninguém agenda pelo link e a agenda avisa se você tentar marcar.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dias trancados</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {blockForm.days.length === 0 && <span className="text-xs text-gray-400">Nenhum dia escolhido</span>}
                      {blockForm.days.map((d) => (
                        <span key={d} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-[rgba(170,85,249,0.15)] dark:text-[#aa55f9] font-medium">
                          {brDay(d)}
                          <button type="button" onClick={() => setBlockForm({ ...blockForm, days: blockForm.days.filter((x) => x !== d) })} className="hover:text-red-500">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="date" value={blockForm.extraDay} onChange={(e) => setBlockForm({ ...blockForm, extraDay: e.target.value })} className={BLOCK_INPUT} />
                      <button
                        type="button"
                        disabled={!blockForm.extraDay}
                        onClick={() => setBlockForm((f) => ({
                          ...f,
                          days: f.days.includes(f.extraDay) ? f.days : [...f.days, f.extraDay].sort(),
                          extraDay: "",
                        }))}
                        className="shrink-0 px-3 rounded-lg border border-purple-200 dark:border-[rgba(170,85,249,0.3)] text-sm text-purple-600 dark:text-[#aa55f9] font-medium disabled:opacity-40"
                      >
                        + Adicionar dia
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observação</label>
                <input
                  value={blockForm.note}
                  onChange={(e) => setBlockForm({ ...blockForm, note: e.target.value })}
                  className={BLOCK_INPUT}
                  placeholder={formMode === "intervalo" ? "opcional, ex.: almoço" : "opcional, ex.: viagem"}
                />
              </div>

              {blockError && <p className="text-sm text-red-500">{blockError}</p>}

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
                  {saving ? "Salvando..." : editingBlockId ? "Salvar alterações" : formMode === "intervalo" ? "Adicionar intervalo" : blockForm.days.length > 1 ? `Trancar ${blockForm.days.length} dias` : "Trancar agenda"}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
