"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight, Check, Trash2, Plus, Heart } from "lucide-react"
import { Dancing_Script } from "next/font/google"

const dancingScript = Dancing_Script({ subsets: ["latin"], weight: ["700"] })

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
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function addDays(d: string, n: number) {
  const [y, m, day] = d.split("-").map(Number)
  const dt = new Date(y, m - 1, day + n)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`
}

function displayDate(d: string) {
  const [y, m, day] = d.split("-").map(Number)
  return new Date(y, m - 1, day).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const [date, setDate]       = useState(todayStr)
  const [tasks, setTasks]     = useState<Task[]>([])
  const [note, setNote]       = useState("")
  const [loading, setLoading] = useState(true)
  const [savedNote, setSaved] = useState(false)

  const [newTodo, setNewTodo]       = useState("")
  const [newSched, setNewSched]     = useState("")
  const [schedTime, setSchedTime]   = useState("")

  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isToday   = date === todayStr()

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const [tr, nr] = await Promise.all([
      fetch(`/api/planner/tasks?date=${d}`).then(r => r.json()),
      fetch(`/api/planner/notes?date=${d}`).then(r => r.json()),
    ])
    setTasks(Array.isArray(tr) ? tr : [])
    setNote(nr?.content ?? "")
    setLoading(false)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function addTask(type: "todo" | "schedule") {
    const title = (type === "todo" ? newTodo : newSched).trim()
    if (!title) return
    const body: Record<string, unknown> = { title, date, type }
    if (type === "schedule" && schedTime) body.time = schedTime
    const res = await fetch("/api/planner/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    if (res.ok) {
      const newTask = await res.json()
      setTasks(ts => [...ts, newTask])
      type === "todo" ? setNewTodo("") : (setNewSched(""), setSchedTime(""))
    }
  }

  async function toggleTask(t: Task) {
    setTasks(ts => ts.map(x => x.id === t.id ? { ...x, done: !x.done } : x))
    await fetch(`/api/planner/tasks/${t.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !t.done }),
    })
  }

  async function deleteTask(id: string) {
    setTasks(ts => ts.filter(x => x.id !== id))
    await fetch(`/api/planner/tasks/${id}`, { method: "DELETE" })
  }

  function handleNote(val: string) {
    setNote(val); setSaved(false)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(async () => {
      await fetch("/api/planner/notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: val, date }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const schedule = [...tasks.filter(t => t.type === "schedule")]
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
  const todos = tasks.filter(t => t.type === "todo")
  const doneCount = todos.filter(t => t.done).length

  // ── Schedule lines (always show at least 8 slots) ──────────────────────────

  const scheduleSlots = Math.max(8, schedule.length + 2)

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="
      min-h-screen p-4 lg:p-7
      bg-[#fdf0f5] dark:bg-[#130720]
      transition-colors duration-300
    ">

      {/* ── Title ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">

        <div className="flex items-center gap-2">
          <Heart size={22} className="text-[#e91e8c] dark:text-[#f472b6] fill-[#e91e8c] dark:fill-[#f472b6]" />
          <h1 className={`text-4xl text-[#c2185b] dark:text-[#f9a8d4] ${dancingScript.className}`}>
            Planner
          </h1>
        </div>

        {/* Date nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(d => addDays(d, -1))}
            className="w-8 h-8 rounded-full flex items-center justify-center transition
              bg-[#fce4ec] hover:bg-[#f8bbd0] text-[#c2185b]
              dark:bg-[rgba(244,114,182,0.15)] dark:hover:bg-[rgba(244,114,182,0.25)] dark:text-[#f472b6]"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="text-center min-w-[160px]">
            <p className="text-sm font-semibold capitalize text-[#880e4f] dark:text-[#f9a8d4]">
              {displayDate(date).split(",")[0]}
              {isToday && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full
                  bg-[#fce4ec] text-[#e91e8c]
                  dark:bg-[rgba(244,114,182,0.2)] dark:text-[#f472b6]">
                  hoje
                </span>
              )}
            </p>
            <p className="text-[11px] text-[#ad1457]/60 dark:text-[#f9a8d4]/40 capitalize">
              {displayDate(date).split(",").slice(1).join(",").trim()}
            </p>
          </div>

          <button
            onClick={() => setDate(d => addDays(d, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center transition
              bg-[#fce4ec] hover:bg-[#f8bbd0] text-[#c2185b]
              dark:bg-[rgba(244,114,182,0.15)] dark:hover:bg-[rgba(244,114,182,0.25)] dark:text-[#f472b6]"
          >
            <ChevronRight size={15} />
          </button>

          {!isToday && (
            <button
              onClick={() => setDate(todayStr())}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition
                bg-[#e91e8c] text-white hover:bg-[#c2185b]
                dark:bg-[rgba(244,114,182,0.25)] dark:text-[#f472b6] dark:hover:bg-[rgba(244,114,182,0.35)]"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px mb-5 bg-gradient-to-r from-[#f48fb1] via-[#ce93d8] to-transparent dark:from-[#f472b6]/30 dark:via-[#a855f7]/20 dark:to-transparent" />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-[#e91e8c] border-t-transparent animate-spin dark:border-[#f472b6]" />
        </div>
      ) : (
        /* ── Main grid: Schedule left | ToDo+Notes right ── */
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ── LEFT: Schedule ───────────────────────────────────────── */}
          <div className="
            flex-1 rounded-3xl overflow-hidden shadow-sm
            bg-white dark:bg-[#1e0a30]
            border border-[#f8bbd0] dark:border-[rgba(244,114,182,0.2)]
          ">
            {/* Schedule header */}
            <div className="flex items-center justify-between px-5 py-3
              border-b border-[#fce4ec] dark:border-[rgba(244,114,182,0.15)]">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-[#e91e8c] dark:bg-[#f472b6]" />
                <h2 className={`font-semibold text-[#880e4f] dark:text-[#f9a8d4] text-lg tracking-wide ${dancingScript.className}`}>
                  Agenda
                </h2>
              </div>
              {/* Add schedule form */}
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={schedTime}
                  onChange={e => setSchedTime(e.target.value)}
                  className="w-24 rounded-lg px-2 py-1 text-xs focus:outline-none
                    bg-[#fce4ec] text-[#880e4f] border border-[#f8bbd0]
                    dark:bg-[rgba(244,114,182,0.1)] dark:text-[#f9a8d4] dark:border-[rgba(244,114,182,0.2)]"
                  style={{ colorScheme: "light" }}
                />
                <input
                  value={newSched}
                  onChange={e => setNewSched(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTask("schedule")}
                  placeholder="Adicionar..."
                  className="w-36 rounded-lg px-2 py-1 text-xs focus:outline-none
                    bg-[#fce4ec] text-[#880e4f] placeholder-[#f48fb1] border border-[#f8bbd0]
                    dark:bg-[rgba(244,114,182,0.1)] dark:text-[#f9a8d4] dark:placeholder-[rgba(244,114,182,0.4)] dark:border-[rgba(244,114,182,0.2)]"
                />
                <button
                  onClick={() => addTask("schedule")}
                  className="w-6 h-6 rounded-lg flex items-center justify-center
                    bg-[#e91e8c] hover:bg-[#c2185b] text-white transition
                    dark:bg-[#9c27b0] dark:hover:bg-[#7b1fa2]"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Schedule lines */}
            <div className="px-5 py-2">
              {schedule.length === 0 && (
                <p className="text-xs text-center py-2 text-[#f48fb1]/60 dark:text-[rgba(244,114,182,0.3)]">
                  Nenhum compromisso — clique em Adicionar ✨
                </p>
              )}
              {Array.from({ length: scheduleSlots }).map((_, i) => {
                const task = schedule[i]
                return (
                  <div key={i} className="
                    flex items-center gap-3 group
                    border-b border-[#fce4ec] dark:border-[rgba(244,114,182,0.08)]
                    py-2.5 min-h-[40px]
                  ">
                    {task ? (
                      <>
                        <button
                          onClick={() => toggleTask(task)}
                          className="w-4 h-4 rounded-sm shrink-0 flex items-center justify-center transition border-2"
                          style={{
                            background: task.done ? "#e91e8c" : "transparent",
                            borderColor: task.done ? "#e91e8c" : "#f48fb1",
                          }}
                        >
                          {task.done && <Check size={9} className="text-white" strokeWidth={3} />}
                        </button>
                        {task.time && (
                          <span className="text-[11px] font-mono shrink-0 text-[#e91e8c] dark:text-[#f472b6] w-10">
                            {task.time}
                          </span>
                        )}
                        <span className={`flex-1 text-sm ${task.done ? "line-through text-[#f48fb1]/50 dark:text-[rgba(244,114,182,0.3)]" : "text-[#4a0020] dark:text-[#f9a8d4]"}`}>
                          {task.title}
                        </span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition text-[#f48fb1] hover:text-[#e91e8c] dark:text-[rgba(244,114,182,0.4)] dark:hover:text-[#f472b6]"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : (
                      <span className="w-full" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT: ToDo + Notes ───────────────────────────────────── */}
          <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-4">

            {/* To Do List */}
            <div className="
              rounded-3xl overflow-hidden shadow-sm
              bg-white dark:bg-[#1e0a30]
              border border-[#f8bbd0] dark:border-[rgba(244,114,182,0.2)]
            ">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3
                border-b border-[#fce4ec] dark:border-[rgba(244,114,182,0.15)]
                bg-[#fce4ec]/60 dark:bg-[rgba(244,114,182,0.08)]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center bg-[#e91e8c] dark:bg-[#9c27b0]">
                    <Check size={11} className="text-white" strokeWidth={3} />
                  </div>
                  <span className={`font-semibold text-lg text-[#880e4f] dark:text-[#f9a8d4] ${dancingScript.className}`}>
                    Tarefas
                  </span>
                </div>
                {todos.length > 0 && (
                  <span className="text-[10px] text-[#e91e8c] dark:text-[#f472b6] font-medium">
                    {doneCount}/{todos.length}
                  </span>
                )}
              </div>

              {/* Add todo */}
              <div className="flex gap-1.5 px-4 pt-3 pb-1">
                <input
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTask("todo")}
                  placeholder="Nova tarefa..."
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none
                    bg-[#fce4ec] text-[#880e4f] placeholder-[#f48fb1] border border-[#f8bbd0]
                    dark:bg-[rgba(244,114,182,0.1)] dark:text-[#f9a8d4] dark:placeholder-[rgba(244,114,182,0.4)] dark:border-[rgba(244,114,182,0.2)]"
                />
                <button
                  onClick={() => addTask("todo")}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                    bg-[#e91e8c] hover:bg-[#c2185b] text-white transition
                    dark:bg-[#9c27b0] dark:hover:bg-[#7b1fa2]"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Todo items */}
              <div className="px-4 pb-3 pt-1 space-y-0.5">
                {todos.length === 0 ? (
                  <p className="text-xs text-center py-3 text-[#f48fb1]/60 dark:text-[rgba(244,114,182,0.3)]">
                    Sem tarefas ainda 💜
                  </p>
                ) : (
                  todos.map(t => (
                    <div key={t.id}
                      className="flex items-center gap-2.5 group py-1.5 border-b border-[#fce4ec]/60 dark:border-[rgba(244,114,182,0.06)]">
                      <button
                        onClick={() => toggleTask(t)}
                        className="w-4 h-4 rounded shrink-0 flex items-center justify-center transition border-2"
                        style={{
                          background: t.done ? "#e91e8c" : "transparent",
                          borderColor: t.done ? "#e91e8c" : "#f48fb1",
                        }}
                      >
                        {t.done && <Check size={9} className="text-white" strokeWidth={3} />}
                      </button>
                      <span className={`flex-1 text-xs ${t.done ? "line-through text-[#f48fb1]/50 dark:text-[rgba(244,114,182,0.3)]" : "text-[#4a0020] dark:text-[#f9a8d4]"}`}>
                        {t.title}
                      </span>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 transition text-[#f48fb1] hover:text-[#e91e8c] dark:hover:text-[#f472b6]"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
                {doneCount > 0 && doneCount === todos.length && (
                  <p className="text-center text-xs pt-2 text-[#e91e8c] dark:text-[#f472b6] font-medium">
                    Tudo feito! 🎉
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="
              rounded-3xl overflow-hidden shadow-sm
              bg-white dark:bg-[#1e0a30]
              border border-[#f8bbd0] dark:border-[rgba(244,114,182,0.2)]
            ">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3
                border-b border-[#fce4ec] dark:border-[rgba(244,114,182,0.15)]
                bg-[#fce4ec]/60 dark:bg-[rgba(244,114,182,0.08)]">
                <div className="flex items-center gap-2">
                  <Heart size={14} className="text-[#e91e8c] dark:text-[#f472b6] fill-[#e91e8c] dark:fill-[#f472b6]" />
                  <span className={`font-semibold text-lg text-[#880e4f] dark:text-[#f9a8d4] ${dancingScript.className}`}>
                    Notas
                  </span>
                </div>
                {savedNote && (
                  <span className="text-[10px] text-[#e91e8c] dark:text-[#f472b6]">salvo ✓</span>
                )}
              </div>

              <div className="p-4">
                <textarea
                  value={note}
                  onChange={e => handleNote(e.target.value)}
                  placeholder={"Pensamentos, ideias, insights...\n\nEsse espaço é só seu 🌙"}
                  rows={7}
                  className="w-full resize-none text-xs focus:outline-none leading-relaxed bg-transparent
                    text-[#4a0020] placeholder-[#f48fb1]/60
                    dark:text-[#f9a8d4] dark:placeholder-[rgba(244,114,182,0.3)]"
                  style={{
                    backgroundImage: "repeating-linear-gradient(transparent, transparent 23px, #fce4ec 23px, #fce4ec 24px)",
                    lineHeight: "24px",
                    paddingTop: "4px",
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
