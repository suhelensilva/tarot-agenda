"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Clock, StickyNote, ListTodo, CalendarDays, Sparkles } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type Task = {
  id: string
  title: string
  done: boolean
  date: string
  time: string | null
  type: "todo" | "schedule"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  const now = new Date()
  // Ajuste para Brasil UTC-3
  const local = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const [date, setDate]         = useState(todayStr)
  const [tasks, setTasks]       = useState<Task[]>([])
  const [noteContent, setNote]  = useState("")
  const [loading, setLoading]   = useState(true)

  // form states
  const [newTodo, setNewTodo]         = useState("")
  const [newSched, setNewSched]       = useState("")
  const [newSchedTime, setSchedTime]  = useState("")
  const [savingNote, setSavingNote]   = useState(false)

  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isToday   = date === todayStr()

  // ── Data fetch ────────────────────────────────────────────────────────────

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const [tasksRes, noteRes] = await Promise.all([
      fetch(`/api/planner/tasks?date=${d}`).then(r => r.json()),
      fetch(`/api/planner/notes?date=${d}`).then(r => r.json()),
    ])
    setTasks(Array.isArray(tasksRes) ? tasksRes : [])
    setNote(noteRes?.content ?? "")
    setLoading(false)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function addTask(type: "todo" | "schedule") {
    const title = type === "todo" ? newTodo.trim() : newSched.trim()
    if (!title) return
    const body: Record<string, unknown> = { title, date, type }
    if (type === "schedule" && newSchedTime) body.time = newSchedTime

    const res = await fetch("/api/planner/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const task = await res.json()
      setTasks(t => [...t, task])
      if (type === "todo") setNewTodo("")
      else { setNewSched(""); setSchedTime("") }
    }
  }

  async function toggleTask(task: Task) {
    const done = !task.done
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, done } : t))
    await fetch(`/api/planner/tasks/${task.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    })
  }

  async function deleteTask(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id))
    await fetch(`/api/planner/tasks/${id}`, { method: "DELETE" })
  }

  function handleNoteChange(val: string) {
    setNote(val)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(async () => {
      setSavingNote(true)
      await fetch("/api/planner/notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: val, date }),
      })
      setSavingNote(false)
    }, 800)
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const scheduleTasks = tasks
    .filter(t => t.type === "schedule")
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))

  const todoTasks = tasks.filter(t => t.type === "todo")
  const doneTodos = todoTasks.filter(t => t.done).length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-5 lg:p-8" style={{
      background: "linear-gradient(135deg, #1a0a2e 0%, #16041f 40%, #0f0a1a 100%)"
    }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #e91e8c, #9c27b0)" }}>
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
              Meu Planner
            </h1>
            <p className="text-xs" style={{ color: "#e879c8" }}>organize seu dia com amor ✨</p>
          </div>
        </div>

        {/* Navegação de data */}
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(d => addDays(d, -1))}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.3)", color: "#e91e8c" }}>
            <ChevronLeft size={16} />
          </button>

          <div className="text-center px-4">
            <p className="text-white font-semibold text-sm capitalize">
              {formatDisplayDate(date).split(",")[0]}
              {isToday && <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(233,30,140,0.2)", color: "#f472b6", border: "1px solid rgba(233,30,140,0.3)" }}>
                hoje
              </span>}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              {formatDisplayDate(date).split(",").slice(1).join(",").trim()}
            </p>
          </div>

          <button onClick={() => setDate(d => addDays(d, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.3)", color: "#e91e8c" }}>
            <ChevronRight size={16} />
          </button>

          {!isToday && (
            <button onClick={() => setDate(todayStr())}
              className="ml-2 text-xs px-3 py-1.5 rounded-full font-medium transition-all"
              style={{ background: "rgba(233,30,140,0.2)", color: "#f472b6", border: "1px solid rgba(233,30,140,0.3)" }}>
              Hoje
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#e91e8c", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Agenda do dia ───────────────────────────────────────────── */}
          <Card
            icon={<Clock size={15} />}
            title="Agenda do Dia"
            accent="#9c27b0"
            accentSoft="rgba(156,39,176,0.15)"
          >
            {/* Add form */}
            <div className="flex gap-2 mb-4">
              <input
                type="time"
                value={newSchedTime}
                onChange={e => setSchedTime(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm focus:outline-none w-28 shrink-0"
                style={{
                  background: "rgba(156,39,176,0.1)",
                  border: "1px solid rgba(156,39,176,0.25)",
                  color: "white",
                  colorScheme: "dark",
                }}
              />
              <input
                value={newSched}
                onChange={e => setNewSched(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTask("schedule")}
                placeholder="Adicionar compromisso..."
                className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none placeholder-[rgba(255,255,255,0.25)]"
                style={{
                  background: "rgba(156,39,176,0.1)",
                  border: "1px solid rgba(156,39,176,0.25)",
                  color: "white",
                }}
              />
              <button onClick={() => addTask("schedule")}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-110"
                style={{ background: "linear-gradient(135deg, #9c27b0, #6a1b9a)" }}>
                <Plus size={16} className="text-white" />
              </button>
            </div>

            {scheduleTasks.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                Nenhum compromisso para hoje 🌸
              </p>
            ) : (
              <div className="space-y-2">
                {scheduleTasks.map(task => (
                  <TaskRow key={task.id} task={task} accent="#9c27b0" onToggle={toggleTask} onDelete={deleteTask} />
                ))}
              </div>
            )}
          </Card>

          {/* ── To Do List ──────────────────────────────────────────────── */}
          <Card
            icon={<ListTodo size={15} />}
            title="To Do List"
            accent="#e91e8c"
            accentSoft="rgba(233,30,140,0.15)"
            badge={todoTasks.length > 0 ? `${doneTodos}/${todoTasks.length}` : undefined}
          >
            {/* Add form */}
            <div className="flex gap-2 mb-4">
              <input
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTask("todo")}
                placeholder="Adicionar tarefa..."
                className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none placeholder-[rgba(255,255,255,0.25)]"
                style={{
                  background: "rgba(233,30,140,0.1)",
                  border: "1px solid rgba(233,30,140,0.25)",
                  color: "white",
                }}
              />
              <button onClick={() => addTask("todo")}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-110"
                style={{ background: "linear-gradient(135deg, #e91e8c, #c2185b)" }}>
                <Plus size={16} className="text-white" />
              </button>
            </div>

            {todoTasks.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                Sem tarefas por aqui 💜
              </p>
            ) : (
              <div className="space-y-2">
                {todoTasks.map(task => (
                  <TaskRow key={task.id} task={task} accent="#e91e8c" onToggle={toggleTask} onDelete={deleteTask} />
                ))}
              </div>
            )}

            {doneTodos > 0 && doneTodos === todoTasks.length && (
              <p className="text-center mt-4 text-sm font-medium" style={{ color: "#e91e8c" }}>
                Tudo concluído! 🎉
              </p>
            )}
          </Card>

          {/* ── Notas ───────────────────────────────────────────────────── */}
          <Card
            icon={<StickyNote size={15} />}
            title="Notas do Dia"
            accent="#f06292"
            accentSoft="rgba(240,98,146,0.15)"
            className="lg:col-span-2"
            extra={
              <span className="text-[10px]" style={{ color: savingNote ? "#f472b6" : "rgba(255,255,255,0.2)" }}>
                {savingNote ? "salvando..." : "salvo automaticamente"}
              </span>
            }
          >
            <textarea
              value={noteContent}
              onChange={e => handleNoteChange(e.target.value)}
              placeholder={"Escreva seus pensamentos, ideias, insights do dia...\n\nEsse espaço é só seu 🌙"}
              rows={7}
              className="w-full resize-none rounded-2xl px-4 py-3 text-sm focus:outline-none placeholder-[rgba(255,255,255,0.2)] leading-relaxed"
              style={{
                background: "rgba(240,98,146,0.06)",
                border: "1px solid rgba(240,98,146,0.2)",
                color: "rgba(255,255,255,0.85)",
              }}
            />
          </Card>

        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({
  icon, title, accent, accentSoft, badge, children, className = "", extra,
}: {
  icon: React.ReactNode
  title: string
  accent: string
  accentSoft: string
  badge?: string
  children: React.ReactNode
  className?: string
  extra?: React.ReactNode
}) {
  return (
    <div className={`rounded-3xl p-5 ${className}`} style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${accentSoft.replace("0.15", "0.25")}`,
      backdropFilter: "blur(10px)",
    }}>
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: accentSoft, color: accent }}>
            {icon}
          </div>
          <h2 className="font-semibold text-white text-sm">{title}</h2>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: accentSoft, color: accent }}>
              {badge}
            </span>
          )}
        </div>
        {extra}
      </div>

      {/* Divider */}
      <div className="mb-4 h-px" style={{ background: `linear-gradient(to right, ${accent}44, transparent)` }} />

      {children}
    </div>
  )
}

function TaskRow({
  task, accent, onToggle, onDelete,
}: {
  task: Task
  accent: string
  onToggle: (t: Task) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 group rounded-xl px-2 py-1.5 transition-all"
      style={{ background: task.done ? "rgba(255,255,255,0.03)" : "transparent" }}>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-all"
        style={{
          background: task.done ? accent : "transparent",
          border: `2px solid ${task.done ? accent : "rgba(255,255,255,0.2)"}`,
        }}
      >
        {task.done && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      {/* Hora (schedule) */}
      {task.time && (
        <span className="text-xs font-mono shrink-0" style={{ color: accent }}>
          {task.time}
        </span>
      )}

      {/* Título */}
      <span className={`flex-1 text-sm transition-all ${task.done ? "line-through" : ""}`}
        style={{ color: task.done ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)" }}>
        {task.title}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
        style={{ color: "rgba(255,255,255,0.3)" }}
        onMouseEnter={e => (e.currentTarget.style.color = accent)}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
