"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight, Check, Trash2, Plus, Heart, X, StickyNote } from "lucide-react"
import { Dancing_Script } from "next/font/google"

const dancingScript = Dancing_Script({ subsets: ["latin"], weight: ["700"] })

// ── Types ─────────────────────────────────────────────────────────────────────

type Task = {
  id: string
  title: string
  done: boolean
  date: string
  time: string | null   // emoji no post-it; hora no schedule (legado)
  type: string          // "todo" | "postit"
}

// ── Post-it visual config ─────────────────────────────────────────────────────

const POSTIT_STYLES = [
  {
    light: { bg: "#fff9c4", shadow: "2px 4px 12px rgba(249,224,75,0.35)",  text: "#5d4037" },
    dark:  { bg: "rgba(255,249,196,0.07)", shadow: "2px 4px 12px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(249,224,75,0.18)", text: "#fde68a" },
  },
  {
    light: { bg: "#fce4ec", shadow: "2px 4px 12px rgba(244,143,177,0.35)", text: "#880e4f" },
    dark:  { bg: "rgba(252,228,236,0.07)", shadow: "2px 4px 12px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(244,143,177,0.18)", text: "#f9a8d4" },
  },
  {
    light: { bg: "#ede7f6", shadow: "2px 4px 12px rgba(186,104,200,0.35)", text: "#4a148c" },
    dark:  { bg: "rgba(237,231,246,0.07)", shadow: "2px 4px 12px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(186,104,200,0.18)", text: "#d8b4fe" },
  },
  {
    light: { bg: "#e8f5e9", shadow: "2px 4px 12px rgba(129,199,132,0.35)", text: "#1b5e20" },
    dark:  { bg: "rgba(232,245,233,0.07)", shadow: "2px 4px 12px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(129,199,132,0.18)", text: "#86efac" },
  },
]

const ROTATIONS = [-2, 1.5, -1, 2.5, -1.5, 1, -2, 2]

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function addDays(d: string, n: number) {
  const [y, m, day] = d.split("-").map(Number)
  const dt = new Date(y, m - 1, day + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

function displayDate(d: string) {
  const [y, m, day] = d.split("-").map(Number)
  return new Date(y, m - 1, day).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  })
}

function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const [date, setDate]       = useState(todayStr)
  const [tasks, setTasks]     = useState<Task[]>([])
  const [note, setNote]       = useState("")
  const [loading, setLoading] = useState(true)
  const [savedNote, setSaved] = useState(false)
  const [newTodo, setNewTodo] = useState("")

  const noteTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const postitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const isToday      = date === todayStr()
  const isDark       = useIsDark()

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

  async function addTodo() {
    const title = newTodo.trim()
    if (!title) return
    const res = await fetch("/api/planner/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date, type: "todo" }),
    })
    if (res.ok) {
      const newTask = await res.json()
      setTasks(ts => [...ts, newTask])
      setNewTodo("")
    }
  }

  async function addPostit() {
    const res = await fetch("/api/planner/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", date, type: "postit" }),
    })
    if (res.ok) {
      const newTask = await res.json()
      setTasks(ts => [...ts, newTask])
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

  function handlePostitContent(id: string, content: string) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, title: content } : t))
    const existing = postitTimers.current.get(id)
    if (existing) clearTimeout(existing)
    postitTimers.current.set(id, setTimeout(async () => {
      await fetch(`/api/planner/tasks/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: content }),
      })
      postitTimers.current.delete(id)
    }, 800))
  }

  function handlePostitIcon(id: string, icon: string) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, time: icon } : t))
    const key = `icon-${id}`
    const existing = postitTimers.current.get(key)
    if (existing) clearTimeout(existing)
    postitTimers.current.set(key, setTimeout(() => {
      fetch(`/api/planner/tasks/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: icon }),
      })
      postitTimers.current.delete(key)
    }, 500))
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

  const postits   = tasks.filter(t => t.type === "postit")
  const todos     = tasks.filter(t => t.type === "todo")
  const doneCount = todos.filter(t => t.done).length

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="
      min-h-screen p-4 lg:p-7
      bg-[#fdf0f5] dark:bg-[#130720]
      transition-colors duration-300
    ">

      {/* ── Título ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Heart size={22} className="text-[#e91e8c] dark:text-[#f472b6] fill-[#e91e8c] dark:fill-[#f472b6]" />
          <h1 className={`text-4xl text-[#c2185b] dark:text-[#f9a8d4] ${dancingScript.className}`}>
            Planner
          </h1>
        </div>

        {/* Navegação de data */}
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

      {/* ── Divisor ── */}
      <div className="h-px mb-5 bg-gradient-to-r from-[#f48fb1] via-[#ce93d8] to-transparent dark:from-[#f472b6]/30 dark:via-[#a855f7]/20 dark:to-transparent" />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-[#e91e8c] border-t-transparent animate-spin dark:border-[#f472b6]" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ── ESQUERDA: Mural de Post-its ──────────────────────────── */}
          <div className="
            flex-1 rounded-3xl overflow-hidden shadow-sm
            bg-white dark:bg-[#1e0a30]
            border border-[#f8bbd0] dark:border-[rgba(244,114,182,0.2)]
          ">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-3
              border-b border-[#fce4ec] dark:border-[rgba(244,114,182,0.15)]">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-[#e91e8c] dark:bg-[#f472b6]" />
                <h2 className={`font-semibold text-[#880e4f] dark:text-[#f9a8d4] text-lg tracking-wide ${dancingScript.className}`}>
                  Mural
                </h2>
              </div>
              <button
                onClick={addPostit}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition
                  bg-[#fce4ec] hover:bg-[#f8bbd0] text-[#c2185b]
                  dark:bg-[rgba(244,114,182,0.15)] dark:hover:bg-[rgba(244,114,182,0.25)] dark:text-[#f472b6]"
              >
                <Plus size={11} />
                Post-it
              </button>
            </div>

            {/* Post-its */}
            <div className="p-5">
              {postits.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <StickyNote size={30} className="text-[#f48fb1]/30 dark:text-[rgba(244,114,182,0.2)]" />
                  <p className="text-xs text-[#f48fb1]/50 dark:text-[rgba(244,114,182,0.25)]">
                    Clique em + Post-it para adicionar ✨
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-5">
                  {postits.map((p, i) => {
                    const style    = POSTIT_STYLES[i % POSTIT_STYLES.length]
                    const rotation = ROTATIONS[i % ROTATIONS.length]
                    const s        = isDark ? style.dark : style.light
                    return (
                      <div
                        key={p.id}
                        className="relative rounded-xl p-3.5 group transition-all hover:scale-[1.03] hover:z-10"
                        style={{
                          backgroundColor: s.bg,
                          transform: `rotate(${rotation}deg)`,
                          boxShadow: s.shadow,
                        }}
                      >
                        {/* Botão remover */}
                        <button
                          onClick={() => deleteTask(p.id)}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
                            opacity-0 group-hover:opacity-100 transition
                            bg-white/70 dark:bg-black/30 hover:bg-red-100 dark:hover:bg-red-900/30
                            text-gray-400 hover:text-red-500"
                        >
                          <X size={10} />
                        </button>

                        {/* Input do emoji/ícone */}
                        <input
                          value={p.time ?? ""}
                          onChange={e => handlePostitIcon(p.id, e.target.value)}
                          placeholder="✨"
                          className="block w-9 text-2xl bg-transparent focus:outline-none mb-1.5
                            placeholder-gray-300/40 dark:placeholder-white/10"
                        />

                        {/* Conteúdo do post-it */}
                        <textarea
                          value={p.title}
                          onChange={e => handlePostitContent(p.id, e.target.value)}
                          placeholder="Escreva aqui..."
                          rows={4}
                          className="w-full bg-transparent resize-none focus:outline-none text-sm leading-relaxed
                            placeholder-gray-400/50 dark:placeholder-white/15"
                          style={{ color: s.text }}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── DIREITA: Tarefas + Notas ──────────────────────────────── */}
          <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-4">

            {/* Tarefas */}
            <div className="
              rounded-3xl overflow-hidden shadow-sm
              bg-white dark:bg-[#1e0a30]
              border border-[#f8bbd0] dark:border-[rgba(244,114,182,0.2)]
            ">
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

              <div className="flex gap-1.5 px-4 pt-3 pb-1">
                <input
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTodo()}
                  placeholder="Nova tarefa..."
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none
                    bg-[#fce4ec] text-[#880e4f] placeholder-[#f48fb1] border border-[#f8bbd0]
                    dark:bg-[rgba(244,114,182,0.1)] dark:text-[#f9a8d4] dark:placeholder-[rgba(244,114,182,0.4)] dark:border-[rgba(244,114,182,0.2)]"
                />
                <button
                  onClick={addTodo}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                    bg-[#e91e8c] hover:bg-[#c2185b] text-white transition
                    dark:bg-[#9c27b0] dark:hover:bg-[#7b1fa2]"
                >
                  <Plus size={13} />
                </button>
              </div>

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
                      <span className={`flex-1 text-xs ${t.done
                        ? "line-through text-[#f48fb1]/50 dark:text-[rgba(244,114,182,0.3)]"
                        : "text-[#4a0020] dark:text-[#f9a8d4]"}`}>
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

            {/* Notas */}
            <div className="
              rounded-3xl overflow-hidden shadow-sm
              bg-white dark:bg-[#1e0a30]
              border border-[#f8bbd0] dark:border-[rgba(244,114,182,0.2)]
            ">
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
