"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Check, Crown, Pencil, Ban } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const TOP_THRESHOLD_KEY = "crm_top_threshold"

type ClientCard = {
  id: string
  name: string
  phone: string
  sessionCount: number
  completedCount: number
  lastAppointmentDate: string | null
  totalSpent: number
  firstServiceName: string | null
  blacklistReason?: string | null
  lastPaymentStatus?: string | null
}

type Column = {
  id: string
  name: string
  color: string
  order: number
  clients: ClientCard[]
  totalRevenue: number
  isUntagged?: boolean
}

const PALETTE = [
  "#6366f1", "#f97316", "#eab308", "#22c55e",
  "#ec4899", "#ef4444", "#3b82f6", "#06b6d4",
]

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

// ----- Card -----
function KanbanCard({
  client,
  color,
  isTop = false,
  onDragStart,
}: {
  client: ClientCard
  color: string
  isTop?: boolean
  onDragStart: (e: React.DragEvent, clientId: string) => void
}) {
  const [nameHovered, setNameHovered] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, client.id)}
      className="relative rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0f0f1a] hover:bg-[#14142a] transition-colors cursor-grab active:cursor-grabbing select-none"
      style={{ borderLeftWidth: 3, borderLeftColor: color, borderLeftStyle: "solid" }}
    >
      {/* Overlay dentro do card ao passar no nome */}
      {nameHovered && (
        <div className="absolute inset-0 z-50 rounded-xl bg-[#0f0f1a]/96 p-3 flex flex-col justify-center pointer-events-none">
          <p className="text-[13px] font-semibold text-white leading-snug mb-2">{client.name}</p>
          {client.firstServiceName && (
            <p className="text-[9px] text-violet-300/50 leading-snug">{client.firstServiceName}</p>
          )}
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
            style={{ background: color + "22", color }}
          >
            {initials(client.name)}
          </div>
          <span
            className="text-sm font-medium text-white flex-1 truncate cursor-default"
            onMouseEnter={() => setNameHovered(true)}
            onMouseLeave={() => setNameHovered(false)}
          >
            {client.name}
          </span>
          {isTop && (
            <div className="flex items-center gap-0.5 bg-amber-500/20 border border-amber-500/40 rounded-full px-1.5 py-0.5 flex-shrink-0 mt-0.5">
              <Crown size={9} className="text-amber-400" />
              <span className="text-[9px] font-semibold text-amber-400">Top</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">{client.completedCount} atend.</span>
          <span className="font-semibold" style={{ color }}>
            {formatCurrency(client.totalSpent)}
          </span>
        </div>
        {client.lastAppointmentDate && (
          <div className="text-[10px] text-gray-600 mt-1">
            Último: {formatDate(client.lastAppointmentDate)}
          </div>
        )}
      </div>
    </div>
  )
}

// ----- Column -----
function KanbanColumn({
  col,
  topThreshold,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  col: Column
  topThreshold: number
  onDragStart: (e: React.DragEvent, clientId: string, fromColId: string) => void
  onDrop: (e: React.DragEvent, toColId: string) => void
  onDragOver: (e: React.DragEvent) => void
}) {
  const [over, setOver] = useState(false)
  const color = col.isUntagged ? "#6b7280" : col.color

  return (
    <div className="flex-shrink-0 w-[210px] flex flex-col gap-2 h-full">
      {/* Cabeçalho fixo */}
      <div className="rounded-xl overflow-hidden flex-shrink-0">
        <div className="px-4 py-3" style={{ background: color }}>
          <span className="text-sm font-medium text-white/95">{col.name}</span>
        </div>
        <div className="bg-[#12121e] px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-2xl font-medium text-white leading-none">
              {col.clients.length}
            </div>
            {col.isUntagged ? (
              <div className="text-[10px] text-gray-600 mt-0.5">sem etiqueta</div>
            ) : (
              <div className="text-[10px] text-gray-600 mt-0.5">
                {formatCurrency(col.totalRevenue)}
              </div>
            )}
          </div>
          <div
            className="text-[10px] font-medium px-2 py-1 rounded-full"
            style={{ background: color + "22", color }}
          >
            ● ativo
          </div>
        </div>
      </div>

      {/* Cards com scroll próprio */}
      <div
        className={`flex flex-col gap-2 overflow-y-auto flex-1 rounded-xl transition-colors p-1 ${
          over ? "bg-white/5" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
          onDragOver(e)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false)
          onDrop(e, col.id)
        }}
      >
        {col.clients.map((c) => (
          <KanbanCard
            key={c.id}
            client={c}
            color={color}
            isTop={c.totalSpent >= topThreshold}
            onDragStart={(e, id) => onDragStart(e, id, col.id)}
          />
        ))}
        {col.clients.length === 0 && (
          <div className="text-[11px] text-gray-700 text-center py-4">
            Arraste clientes aqui
          </div>
        )}
      </div>
    </div>
  )
}

// ----- Top Clientes Column -----
function TopClientesColumn({
  allClients,
  threshold,
  onThresholdChange,
}: {
  allClients: ClientCard[]
  threshold: number
  onThresholdChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(String(threshold))
  const color = "#f59e0b"
  const topClients = allClients
    .filter((c) => c.totalSpent >= threshold)
    .sort((a, b) => b.totalSpent - a.totalSpent)

  function saveThreshold() {
    const v = parseFloat(inputVal.replace(",", "."))
    if (!isNaN(v) && v >= 0) onThresholdChange(v)
    setEditing(false)
  }

  return (
    <div className="flex-shrink-0 w-[210px] flex flex-col gap-2 h-full">
      {/* Cabeçalho */}
      <div className="rounded-xl overflow-hidden flex-shrink-0">
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: color }}>
          <Crown size={13} className="text-white/90" />
          <span className="text-sm font-medium text-white/95">Top Clientes</span>
        </div>
        <div className="bg-[#12121e] px-4 py-3">
          <div className="text-2xl font-medium text-white leading-none mb-1">{topClients.length}</div>
          <div className="flex items-center gap-1">
            {editing ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">R$</span>
                <input
                  autoFocus
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onBlur={saveThreshold}
                  onKeyDown={(e) => { if (e.key === "Enter") saveThreshold(); if (e.key === "Escape") setEditing(false) }}
                  className="w-20 text-[11px] bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-white focus:outline-none"
                />
              </div>
            ) : (
              <button
                onClick={() => { setInputVal(String(threshold)); setEditing(true) }}
                className="flex items-center gap-1 group"
              >
                <span className="text-[10px] text-gray-600">acima de {formatCurrency(threshold)}</span>
                <Pencil size={9} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards (somente leitura) */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 rounded-xl p-1">
        {topClients.map((c) => (
          <KanbanCard
            key={c.id}
            client={c}
            color={color}
            isTop={true}
            onDragStart={() => {}}
          />
        ))}
        {topClients.length === 0 && (
          <div className="text-[11px] text-gray-700 text-center py-4">
            Nenhuma cliente acima de {formatCurrency(threshold)}
          </div>
        )}
      </div>
    </div>
  )
}

// ----- Blacklist -----
// ----- Blacklist Card (visual agressivo) -----
function BlacklistCard({
  client,
  onDragStart,
}: {
  client: ClientCard
  onDragStart: (e: React.DragEvent, clientId: string) => void
}) {
  const [nameHovered, setNameHovered] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, client.id)}
      className="relative rounded-xl cursor-grab active:cursor-grabbing select-none overflow-hidden"
      style={{
        background: "#0a0000",
        borderLeft: "3px solid #ff2222",
        border: "1px solid rgba(255,30,30,0.2)",
        borderLeftWidth: "3px",
        borderLeftColor: "#ff2222",
      }}
    >
      {/* Overlay ao passar no nome */}
      {nameHovered && (
        <div className="absolute inset-0 z-50 rounded-xl p-3 flex flex-col justify-center pointer-events-none"
          style={{ background: "rgba(10,0,0,0.96)" }}>
          <p className="text-[13px] font-semibold text-red-100 leading-snug mb-2">{client.name}</p>
          {client.firstServiceName && (
            <p className="text-[9px] leading-snug" style={{ color: "rgba(255,80,80,0.5)" }}>{client.firstServiceName}</p>
          )}
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: "rgba(220,0,0,0.3)", color: "#ff4444" }}
          >
            {initials(client.name)}
          </div>
          <span
            className="text-sm font-medium text-red-100 flex-1 truncate cursor-default"
            onMouseEnter={() => setNameHovered(true)}
            onMouseLeave={() => setNameHovered(false)}
          >
            {client.name}
          </span>
        </div>
        {client.blacklistReason ? (
          <p className="text-[10px] italic mb-1.5 leading-snug" style={{ color: "rgba(255,80,80,0.6)" }}>
            {client.blacklistReason}
          </p>
        ) : (
          <p className="text-[10px] italic mb-1.5" style={{ color: "rgba(255,80,80,0.25)" }}>sem motivo registrado</p>
        )}
        <div className="text-[10px]" style={{ color: "rgba(255,60,60,0.35)" }}>
          {client.completedCount} atend. · {formatCurrency(client.totalSpent)}
        </div>
      </div>
    </div>
  )
}

// ----- Blacklist Column -----
function BlacklistColumn({
  clients,
  listId,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  clients: ClientCard[]
  listId: string
  onDragStart: (e: React.DragEvent, clientId: string, fromColId: string) => void
  onDrop: (e: React.DragEvent, toColId: string) => void
  onDragOver: (e: React.DragEvent) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="flex-shrink-0 w-[210px] flex flex-col gap-2 h-full">
      {/* Cabeçalho */}
      <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(220,0,0,0.3)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#b91c1c" }}>
          <Ban size={13} className="text-white" />
          <span className="text-sm font-bold text-white tracking-wide">BLACKLIST</span>
        </div>
        <div className="px-4 py-3" style={{ background: "#0a0000" }}>
          <div className="text-2xl font-medium leading-none mb-1" style={{ color: "#ff4444" }}>{clients.length}</div>
          <div className="text-[10px]" style={{ color: "rgba(255,60,60,0.4)" }}>clientes bloqueadas</div>
        </div>
      </div>

      {/* Zona de drop + cards */}
      <div
        className={`flex flex-col gap-2 overflow-y-auto flex-1 rounded-xl p-1 transition-all ${dragOver ? "ring-1 ring-red-600" : ""}`}
        style={dragOver ? { background: "rgba(180,0,0,0.08)" } : {}}
        onDrop={(e) => { setDragOver(false); onDrop(e, listId) }}
        onDragOver={(e) => { onDragOver(e); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
      >
        {clients.map((c) => (
          <BlacklistCard
            key={c.id}
            client={c}
            onDragStart={(e, id) => onDragStart(e, id, listId)}
          />
        ))}
        {clients.length === 0 && (
          <div className={`text-[11px] text-center py-4 transition-colors ${dragOver ? "" : ""}`}
            style={{ color: dragOver ? "#ff4444" : "rgba(255,60,60,0.25)" }}>
            Arraste clientes aqui
          </div>
        )}
      </div>
    </div>
  )
}

// ----- Nova Coluna -----
function NewColumnCard({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [color, setColor] = useState(PALETTE[0])
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setOpen(true)
    setName("")
    setColor(PALETTE[0])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await fetch("/api/etiquetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      })
      setOpen(false)
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex-shrink-0 w-[210px] flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-xl text-gray-600 hover:text-gray-400 hover:border-white/20 transition-colors min-h-[120px]"
      >
        <Plus size={18} />
        <span className="text-xs">Nova etiqueta</span>
      </button>
    )
  }

  return (
    <div className="flex-shrink-0 w-[210px] rounded-xl border border-white/10 bg-[#0f0f1a] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300">Nova etiqueta</span>
        <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-400">
          <X size={14} />
        </button>
      </div>

      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        placeholder="Nome da etiqueta"
        className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25"
      />

      {/* Paleta de cores */}
      <div className="flex flex-wrap gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
            style={{ background: c }}
          >
            {color === c && <Check size={12} className="text-white" />}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="rounded-lg overflow-hidden">
        <div className="px-3 py-2 text-xs font-medium text-white/90" style={{ background: color }}>
          {name || "Prévia"}
        </div>
        <div className="bg-[#12121e] px-3 py-2 text-xs text-gray-600">0 clientes</div>
      </div>

      <button
        onClick={handleCreate}
        disabled={!name.trim() || saving}
        className="w-full py-2 rounded-lg text-xs font-medium text-white transition-opacity disabled:opacity-40"
        style={{ background: color }}
      >
        {saving ? "Criando..." : "Criar etiqueta"}
      </button>
    </div>
  )
}

// ----- Main Page -----
export default function CrmPage() {
  const [columns, setColumns] = useState<Column[]>([])
  const [blacklist, setBlacklist] = useState<{ id: string; clients: ClientCard[] }>({ id: "", clients: [] })
  const [pendingBlacklist, setPendingBlacklist] = useState<{ card: ClientCard; fromColId: string } | null>(null)
  const [pendingReason, setPendingReason] = useState("")
  const [loading, setLoading] = useState(true)
  const dragRef = useRef<{ clientId: string; fromColId: string } | null>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [topThreshold, setTopThreshold] = useState<number>(500)

  useEffect(() => {
    const saved = localStorage.getItem(TOP_THRESHOLD_KEY)
    if (saved !== null) setTopThreshold(parseFloat(saved))
  }, [])

  function handleTopThresholdChange(v: number) {
    setTopThreshold(v)
    localStorage.setItem(TOP_THRESHOLD_KEY, String(v))
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/crm/kanban")
      const data = await res.json()

      const untaggedCol: Column = {
        id: "__untagged__",
        name: "Sem etiqueta",
        color: "#6b7280",
        order: -1,
        clients: data.untagged,
        totalRevenue: data.untaggedRevenue,
        isUntagged: true,
      }
      const userCols: Column[] = data.lists.map((l: Column) => ({ ...l, isUntagged: false }))
      setColumns([untaggedCol, ...userCols])
      setBlacklist(data.blacklist ?? { id: "", clients: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleDragStart(e: React.DragEvent, clientId: string, fromColId: string) {
    dragRef.current = { clientId, fromColId }
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  async function executeMove(clientId: string, fromColId: string, toColId: string, reason?: string) {
    const blacklistId = blacklist.id

    const getCard = () => {
      const fromCol = columns.find((c) => c.id === fromColId)
      if (fromCol) return fromCol.clients.find((c) => c.id === clientId) ?? null
      return blacklist.clients.find((c) => c.id === clientId) ?? null
    }
    const card = getCard()
    if (!card) return

    if (fromColId === blacklistId) {
      setBlacklist((prev) => ({ ...prev, clients: prev.clients.filter((c) => c.id !== clientId) }))
    } else {
      setColumns((prev) => prev.map((col) =>
        col.id === fromColId ? { ...col, clients: col.clients.filter((c) => c.id !== clientId) } : col
      ))
    }

    if (toColId === blacklistId) {
      setBlacklist((prev) => ({ ...prev, clients: [{ ...card, blacklistReason: reason ?? null }, ...prev.clients] }))
    } else {
      setColumns((prev) => prev.map((col) =>
        col.id === toColId ? { ...col, clients: [card, ...col.clients] } : col
      ))
    }

    try {
      const isSpecialFrom = fromColId === "__untagged__" || fromColId === blacklistId
      if (!isSpecialFrom) {
        await fetch(`/api/clientes/${clientId}/etiquetas`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId: fromColId }),
        })
      }
      if (toColId !== "__untagged__") {
        await fetch(`/api/clientes/${clientId}/etiquetas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId: toColId === blacklistId ? blacklistId : toColId, reason: reason ?? null }),
        })
      }
    } catch {
      fetchData()
    }
  }

  async function handleDrop(e: React.DragEvent, toColId: string) {
    e.preventDefault()
    const drag = dragRef.current
    if (!drag || drag.fromColId === toColId) return
    dragRef.current = null

    const { clientId, fromColId } = drag

    if (toColId === blacklist.id) {
      // Pede motivo antes de confirmar
      const fromCol = columns.find((c) => c.id === fromColId)
      const card = fromCol?.clients.find((c) => c.id === clientId) ?? blacklist.clients.find((c) => c.id === clientId)
      if (card) {
        setPendingBlacklist({ card, fromColId })
        setPendingReason("")
      }
      return
    }

    await executeMove(clientId, fromColId, toColId)
  }

  async function confirmBlacklist() {
    if (!pendingBlacklist) return
    const { card, fromColId } = pendingBlacklist
    setPendingBlacklist(null)
    await executeMove(card.id, fromColId, blacklist.id, pendingReason.trim() || undefined)
  }

  function cancelBlacklist() {
    setPendingBlacklist(null)
    setPendingReason("")
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Carregando CRM...</div>
      </div>
    )
  }

  const allRegularClients = columns.flatMap((c) => c.clients)
  const totalClients = allRegularClients.length + blacklist.clients.length
  const labelCount = columns.filter((c) => !c.isUntagged).length
  const recorrentes = allRegularClients.filter((c) => c.completedCount > 1).length
  const topClientes = allRegularClients.filter((c) => c.totalSpent >= topThreshold).length
  const devendo = allRegularClients.filter((c) => c.lastPaymentStatus === "Pendente").length
  const totalReceita = allRegularClients.reduce((s, c) => s + c.totalSpent, 0)

  const stats = [
    { label: "Total de clientes", value: totalClients, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" },
    { label: "Com recorrência", value: recorrentes, color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
    { label: "Top clientes", value: topClientes, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    { label: "Na blacklist", value: blacklist.clients.length, color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
    { label: "Com pagamento pendente", value: devendo, color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)" },
    { label: "Receita total", value: formatCurrency(totalReceita), color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.25)" },
  ]

  return (
    <div className="flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 z-10 bg-[#0a0a0f]">
        <div>
          <h1 className="text-lg font-semibold text-white">CRM</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalClients} clientes · {labelCount} {labelCount === 1 ? "etiqueta" : "etiquetas"}
          </p>
        </div>
        <button
          onClick={() => dashboardRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-colors"
        >
          Dashboard
        </button>
      </div>

      {/* Kanban board — altura fixa para colunas scrollarem internamente */}
      <div className="overflow-x-auto px-6 py-4" style={{ height: "calc(100vh - 65px)" }}>
        <div className="flex gap-4 h-full" style={{ minWidth: "max-content" }}>
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              topThreshold={topThreshold}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          ))}
          <TopClientesColumn
            allClients={allRegularClients}
            threshold={topThreshold}
            onThresholdChange={handleTopThresholdChange}
          />
          {blacklist.id && (
            <BlacklistColumn
              clients={blacklist.clients}
              listId={blacklist.id}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          )}
          <NewColumnCard onCreated={fetchData} />
        </div>
      </div>

      {/* Dashboard */}
      <div ref={dashboardRef} className="border-t border-white/5 px-6 py-8 flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-white">Dashboard</h2>
          <p className="text-xs text-gray-500 mt-0.5">Visao geral das suas clientes</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <span className="text-[10px] text-gray-500 leading-tight">{s.label}</span>
              <span className="text-2xl font-bold leading-none" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Barra de proporcao */}
        <div className="mt-6 rounded-2xl p-5 border border-white/5 bg-[#0f0f1a]">
          <p className="text-xs text-gray-500 mb-4">Distribuicao de clientes</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {totalClients > 0 && [
              { pct: (recorrentes / totalClients) * 100, color: "#8b5cf6", label: "Recorrentes" },
              { pct: (blacklist.clients.length / totalClients) * 100, color: "#ef4444", label: "Blacklist" },
              { pct: (devendo / totalClients) * 100, color: "#f97316", label: "Pendente" },
              { pct: ((totalClients - recorrentes - blacklist.clients.length - devendo) / totalClients) * 100, color: "#1e1b4b", label: "Outros" },
            ].map((seg) => (
              seg.pct > 0 && (
                <div
                  key={seg.label}
                  className="h-full rounded-sm"
                  style={{ width: `${seg.pct}%`, background: seg.color }}
                  title={`${seg.label}: ${Math.round(seg.pct)}%`}
                />
              )
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {[
              { color: "#8b5cf6", label: "Recorrentes", n: recorrentes },
              { color: "#f59e0b", label: "Top clientes", n: topClientes },
              { color: "#ef4444", label: "Blacklist", n: blacklist.clients.length },
              { color: "#f97316", label: "Pendente", n: devendo },
            ].map((leg) => (
              <div key={leg.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: leg.color }} />
                <span className="text-[10px] text-gray-500">{leg.label} <span className="text-gray-400">{leg.n}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de motivo ao arrastar para blacklist */}
      {pendingBlacklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="rounded-2xl p-6 w-80 shadow-2xl" style={{ background: "#0d0000", border: "1px solid rgba(220,0,0,0.35)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Ban size={15} style={{ color: "#ff4444" }} />
              <h3 className="text-sm font-bold" style={{ color: "#ff4444" }}>Adicionar a Blacklist</h3>
            </div>
            <p className="text-xs text-red-200/60 mb-4 truncate">{pendingBlacklist.card.name}</p>
            <textarea
              autoFocus
              rows={3}
              placeholder="Motivo (opcional)..."
              value={pendingReason}
              onChange={(e) => setPendingReason(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) confirmBlacklist(); if (e.key === "Escape") cancelBlacklist() }}
              className="w-full text-sm text-red-100 placeholder-red-900/60 rounded-xl px-3 py-2.5 focus:outline-none resize-none"
              style={{ background: "#080000", border: "1px solid rgba(200,0,0,0.25)" }}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={cancelBlacklist}
                className="text-xs px-4 py-2 rounded-xl transition-colors"
                style={{ color: "rgba(255,100,100,0.5)" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmBlacklist}
                className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                style={{ background: "#7f1d1d", color: "#ffcccc" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
