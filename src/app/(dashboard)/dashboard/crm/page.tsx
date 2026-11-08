"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Settings2, GripVertical } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type ClientCard = {
  id: string
  name: string
  phone: string
  sessionCount: number
  completedCount: number
  lastAppointmentDate: string | null
  totalSpent: number
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
  onDragStart,
}: {
  client: ClientCard
  color: string
  onDragStart: (e: React.DragEvent, clientId: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, client.id)}
      className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0f0f1a] hover:bg-[#14142a] transition-colors cursor-grab active:cursor-grabbing select-none"
      style={{ borderLeftWidth: 3, borderLeftColor: color, borderLeftStyle: "solid" }}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
            style={{ background: color + "22", color }}
          >
            {initials(client.name)}
          </div>
          <span className="text-sm font-medium text-white truncate">{client.name}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">
            {client.completedCount} atend.
          </span>
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
  onDragStart,
  onDrop,
  onDragOver,
}: {
  col: Column
  onDragStart: (e: React.DragEvent, clientId: string, fromColId: string) => void
  onDrop: (e: React.DragEvent, toColId: string) => void
  onDragOver: (e: React.DragEvent) => void
}) {
  const [over, setOver] = useState(false)
  const color = col.isUntagged ? "#6b7280" : col.color

  return (
    <div className="flex-shrink-0 w-[210px] flex flex-col gap-2">
      {/* Header */}
      <div className="rounded-xl overflow-hidden">
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

      {/* Cards area */}
      <div
        className={`flex flex-col gap-2 min-h-[80px] rounded-xl transition-colors p-1 ${
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

// ----- Main Page -----
export default function CrmPage() {
  const router = useRouter()
  const [columns, setColumns] = useState<Column[]>([])
  const [loading, setLoading] = useState(true)
  const dragRef = useRef<{ clientId: string; fromColId: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/crm/kanban")
      const data = await res.json()

      const cols: Column[] = data.lists.map((l: Column) => ({ ...l, isUntagged: false }))
      cols.push({
        id: "__untagged__",
        name: "Sem etiqueta",
        color: "#6b7280",
        order: 9999,
        clients: data.untagged,
        totalRevenue: data.untaggedRevenue,
        isUntagged: true,
      })
      setColumns(cols)
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

  async function handleDrop(e: React.DragEvent, toColId: string) {
    e.preventDefault()
    const drag = dragRef.current
    if (!drag || drag.fromColId === toColId) return
    dragRef.current = null

    const { clientId, fromColId } = drag

    // Optimistic update
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, clients: [...col.clients] }))
      const src = next.find((c) => c.id === fromColId)
      const dst = next.find((c) => c.id === toColId)
      if (!src || !dst) return prev
      const idx = src.clients.findIndex((c) => c.id === clientId)
      if (idx === -1) return prev
      const [card] = src.clients.splice(idx, 1)
      dst.clients.unshift(card)
      return next
    })

    // Persist: remove from old list, add to new list
    try {
      if (fromColId !== "__untagged__") {
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
          body: JSON.stringify({ listId: toColId }),
        })
      }
    } catch {
      // Revert on error
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Carregando CRM...</div>
      </div>
    )
  }

  const totalClients = columns.reduce((s, c) => s + c.clients.length, 0)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white">CRM</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalClients} clientes em {columns.length} colunas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard/configuracoes")}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            <Settings2 size={13} />
            Etiquetas
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto px-6 py-4">
        <div className="flex gap-4 h-full" style={{ minWidth: "max-content" }}>
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          ))}
          {columns.filter((c) => !c.isUntagged).length === 0 && (
            <div className="flex flex-col items-center justify-center w-64 border border-dashed border-white/10 rounded-xl text-gray-600 text-sm gap-2">
              <Plus size={20} />
              <span>Crie etiquetas para começar</span>
              <button
                onClick={() => router.push("/dashboard/configuracoes")}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Ir para Configurações
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
