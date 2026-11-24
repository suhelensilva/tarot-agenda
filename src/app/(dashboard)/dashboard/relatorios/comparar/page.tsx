"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis,
  RadarChart, Radar, PolarGrid, PolarRadiusAxis,
} from "recharts"
import {
  ArrowLeft, ArrowLeftRight, Download, TrendingUp, TrendingDown, Minus, BarChart3, AreaChart as AreaIcon, Loader2,
  DollarSign, ArrowDownRight, Wallet, Users, Sparkles, HeartHandshake, UserPlus, Repeat, Star, Clock,
} from "lucide-react"
import { PlanGate } from "@/components/plan-gate"
import {
  type CompareData, type Metric, type Grouping, type AlignedRow, type Breakdown, type ClientMix,
  METRIC_LABELS, GROUPING_LABELS, LOWER_IS_BETTER, WEEKDAY_ORDER, CLIENT_GROUPS,
  alignPeriods, defaultGrouping, metricStory, metricTotal, breakdown, weekdayTotals, rangeLabel, formatMetric,
  mixTotals, revenueShare, clientStory, hourStory, formatHours,
  pctChange, formatPct, trend, brl, num,
  todayBR, isoFrom, addDays, daysBetween, minusYear,
} from "@/lib/comparativo"

// ── Visual ────────────────────────────────────────────────────────────────────

// A = ciano, B = magenta (contraste bom no claro e no escuro)
const A_COLOR = "#06b6d4"
const A_LIGHT = "#67e8f9"
const B_COLOR = "#d946ef"
const B_LIGHT = "#f0abfc"

const DONUT = ["#a855f7", "#ec4899", "#06b6d4", "#f59e0b", "#10b981", "#6366f1"]

const METRIC_META: Record<Metric, { icon: React.ReactNode; grad: string }> = {
  revenue: { icon: <DollarSign size={17} />, grad: "from-violet-500 to-fuchsia-500" },
  expenses: { icon: <ArrowDownRight size={17} />, grad: "from-rose-500 to-orange-400" },
  profit: { icon: <Wallet size={17} />, grad: "from-emerald-500 to-cyan-500" },
  sessions: { icon: <Users size={17} />, grad: "from-indigo-500 to-sky-500" },
}

const card = "relative rounded-3xl border border-purple-100/80 dark:border-[rgba(170,85,249,0.16)] bg-white dark:bg-[#110d22] shadow-[0_8px_30px_rgba(124,58,237,0.07)] dark:shadow-[0_0_40px_rgba(168,85,247,0.06)]"
const inputCls = "border border-purple-100 dark:border-[rgba(170,85,249,0.2)] bg-white dark:bg-[#1a1530] dark:text-white rounded-xl px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
    on
      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_14px_rgba(192,38,211,0.35)]"
      : "bg-purple-50/60 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-white/10"
  }`
const axisTick = { fontSize: 11, fill: "rgba(140,140,170,0.85)" }

type View = Metric | "clients" | "hourly"

// ── Atalhos de período ────────────────────────────────────────────────────────

type Ranges = { aFrom: string; aTo: string; bFrom: string; bTo: string }
type PresetKind = "mes" | "semana" | "ano" | "mesAnoPassado"

function presetRanges(kind: PresetKind): Ranges {
  const t = todayBR()
  const [y, m, d] = t.split("-").map(Number)
  if (kind === "mes") {
    const lastPrev = new Date(Date.UTC(y, m - 1, 0)).getUTCDate()
    return { aFrom: isoFrom(y, m - 2, 1), aTo: isoFrom(y, m - 2, Math.min(d, lastPrev)), bFrom: isoFrom(y, m - 1, 1), bTo: t }
  }
  if (kind === "semana") {
    const wd = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
    const bFrom = addDays(t, -wd)
    return { aFrom: addDays(bFrom, -7), aTo: addDays(t, -7), bFrom, bTo: t }
  }
  const bFrom = kind === "ano" ? isoFrom(y, 0, 1) : isoFrom(y, m - 1, 1)
  return { aFrom: minusYear(bFrom), aTo: minusYear(t), bFrom, bTo: t }
}

const PRESETS: { kind: PresetKind; label: string }[] = [
  { kind: "mes", label: "Mês passado x este mês" },
  { kind: "semana", label: "Semana passada x esta" },
  { kind: "mesAnoPassado", label: "Este mês: ano passado x agora" },
  { kind: "ano", label: "Ano passado x este ano" },
]

const validRanges = (r: Ranges) => !!(r.aFrom && r.aTo && r.bFrom && r.bTo && r.aFrom <= r.aTo && r.bFrom <= r.bTo)

const shortMoney = (v: number) => {
  const s = v < 0 ? "-" : ""
  const n = Math.abs(v)
  return n >= 1000 ? `${s}R$${num(n / 1000, n >= 10000 ? 0 : 1)}k` : `${s}R$${num(n)}`
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function CompararPage() {
  const initial = useMemo(() => presetRanges("mes"), [])
  const [ranges, setRanges] = useState<Ranges>(initial)
  const [nameA, setNameA] = useState("")
  const [nameB, setNameB] = useState("")
  const [view, setView] = useState<View>("revenue")
  const metric: Metric = view === "clients" || view === "hourly" ? "revenue" : view
  const [grouping, setGrouping] = useState<Grouping | "auto">("auto")
  const [chartType, setChartType] = useState<"area" | "bar">("area")
  const [data, setData] = useState<CompareData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [pdfBusy, setPdfBusy] = useState(false)
  const reqId = useRef(0)

  const run = useCallback(async (r: Ranges) => {
    if (!validRanges(r)) { setError("Confira as datas: o início precisa ser antes do fim."); return }
    const id = ++reqId.current
    setError(""); setLoading(true)
    try {
      const qs = new URLSearchParams(r).toString()
      const res = await fetch(`/api/relatorios/comparar?${qs}`)
      const json = await res.json()
      if (id !== reqId.current) return
      if (!res.ok) { setError(json.error ?? "Não foi possível comparar."); return }
      setData(json)
      window.history.replaceState(null, "", `?${qs}`)
    } catch {
      if (id === reqId.current) setError("Erro de conexão. Tente de novo.")
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [])

  // Abre com os períodos da URL ou com "mês passado x este mês"
  const first = useRef(true)
  useEffect(() => {
    if (!first.current) return
    first.current = false
    const sp = new URLSearchParams(window.location.search)
    const fromUrl = { aFrom: sp.get("aFrom") ?? "", aTo: sp.get("aTo") ?? "", bFrom: sp.get("bFrom") ?? "", bTo: sp.get("bTo") ?? "" }
    setRanges(validRanges(fromUrl) ? fromUrl : initial) // URL só existe no navegador
  }, [initial])

  // Mudou alguma data → atualiza sozinho
  useEffect(() => {
    if (!validRanges(ranges)) return
    const t = setTimeout(() => run(ranges), 450)
    return () => clearTimeout(t)
  }, [ranges, run])

  const set = (k: keyof Ranges) => (e: React.ChangeEvent<HTMLInputElement>) => setRanges((r) => ({ ...r, [k]: e.target.value }))
  const aBeforeB = () => {
    const len = daysBetween(ranges.bFrom, ranges.bTo)
    setRanges((r) => ({ ...r, aFrom: addDays(r.bFrom, -len), aTo: addDays(r.bFrom, -1) }))
  }
  const aLastYear = () => setRanges((r) => ({ ...r, aFrom: minusYear(r.bFrom), aTo: minusYear(r.bTo) }))
  const swap = () => {
    setRanges((r) => ({ aFrom: r.bFrom, aTo: r.bTo, bFrom: r.aFrom, bTo: r.aTo }))
    setNameA(nameB); setNameB(nameA)
  }

  const labelA = nameA.trim() || (data ? rangeLabel(data.a.from, data.a.to) : "Período A")
  const labelB = nameB.trim() || (data ? rangeLabel(data.b.from, data.b.to) : "Período B")
  const effGrouping: Grouping = grouping === "auto"
    ? defaultGrouping(data ? Math.max(data.a.days.length, data.b.days.length) : 31)
    : grouping

  const rows = useMemo(() => (data ? alignPeriods(data.a.days, data.b.days, effGrouping) : []), [data, effGrouping])
  const story = data ? metricStory(metric, data, labelA, labelB) : null
  const bd = data ? breakdown(metric, data) : null

  async function downloadPdf() {
    if (!data) return
    setPdfBusy(true)
    try {
      const { downloadComparativoPdf } = await import("@/lib/comparativo-pdf")
      await downloadComparativoPdf({ data, nameA: labelA, nameB: labelB, grouping: effGrouping, chartType: chartType === "area" ? "line" : "bar", first: view })
    } catch (e) {
      alert(`Não foi possível gerar o PDF: ${e instanceof Error ? e.message : e}`)
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <PlanGate feature="relatorios" message="Relatórios e métricas estão disponíveis a partir do plano Pró.">
      <div className="p-6 lg:p-8 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/dashboard/relatorios" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 mb-1">
              <ArrowLeft size={13} /> Relatório financeiro
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">Comparar períodos</h1>
          </div>
          <button onClick={downloadPdf} disabled={!data || pdfBusy}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 disabled:opacity-50 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition shadow-[0_0_20px_rgba(192,38,211,0.35)]">
            {pdfBusy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {pdfBusy ? "Gerando PDF…" : "Baixar relatório (PDF)"}
          </button>
        </div>

        {/* Períodos */}
        <div className={`${card} p-4 space-y-3`}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <PeriodPicker color={A_COLOR} letter="A" from={ranges.aFrom} to={ranges.aTo} onFrom={set("aFrom")} onTo={set("aTo")} name={nameA} onName={setNameA} />
            <button onClick={swap} title="Trocar A e B"
              className="justify-self-center p-2.5 rounded-2xl bg-purple-50 dark:bg-white/5 text-purple-500 hover:bg-purple-100 dark:hover:bg-white/10">
              <ArrowLeftRight size={15} />
            </button>
            <PeriodPicker color={B_COLOR} letter="B" from={ranges.bFrom} to={ranges.bTo} onFrom={set("bFrom")} onTo={set("bTo")} name={nameB} onName={setNameB} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => <button key={p.kind} onClick={() => setRanges(presetRanges(p.kind))} className={chip(false)}>{p.label}</button>)}
            <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
            <button onClick={aBeforeB} className={chip(false)}>A = período antes do B</button>
            <button onClick={aLastYear} className={chip(false)}>A = B no ano passado</button>
            {loading && <Loader2 size={14} className="animate-spin text-fuchsia-500 ml-1" />}
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>

        {!data && loading && (
          <div className="flex items-center justify-center h-60">
            <div className="w-9 h-9 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
          </div>
        )}

        {data && story && bd && (
          <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>

            {/* Cartões = escolher o que comparar */}
            {/* Faixa de cartões: não espreme — se não couber, rola para o lado */}
            <div className="cmp-scroll flex gap-4 overflow-x-auto pt-1 pb-3 -mx-1 px-1 snap-x">
              {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
                <div key={m} className="snap-start shrink-0 w-[250px]">
                  <MetricCard metric={m} active={view === m} onClick={() => setView(m)}
                    a={metricTotal(m, data.a.summary)} b={metricTotal(m, data.b.summary)} />
                </div>
              ))}
              <div className="snap-start shrink-0 w-[250px]">
                <ClientsCard active={view === "clients"} onClick={() => setView("clients")}
                  a={mixTotals(data.a.clientMix).clients} b={mixTotals(data.b.clientMix).clients} />
              </div>
              <div className="snap-start shrink-0 w-[250px]">
                <HourCard active={view === "hourly"} onClick={() => setView("hourly")}
                  a={data.a.summary.revenuePerHour} b={data.b.summary.revenuePerHour} />
              </div>
            </div>

            {view === "clients" ? (
              <ClientsView data={data} labelA={labelA} labelB={labelB} />
            ) : view === "hourly" ? (
              <HourlyView data={data} labelA={labelA} labelB={labelB} grouping={effGrouping} />
            ) : (<>

            {/* Gráfico principal + anéis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className={`${card} p-6 lg:col-span-2`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">{METRIC_LABELS[metric]} {GROUPING_LABELS[effGrouping].toLowerCase()}</h2>
                    <Legend labelA={labelA} labelB={labelB} />
                  </div>
                  <div className="flex items-center gap-1 bg-purple-50/60 dark:bg-white/5 rounded-full p-1">
                    <button onClick={() => setGrouping("auto")} className={chip(grouping === "auto")}>Auto</button>
                    {(Object.keys(GROUPING_LABELS) as Grouping[]).map((g) => (
                      <button key={g} onClick={() => setGrouping(g)} className={chip(grouping === g)}>{g === "day" ? "Dia" : g === "week" ? "Semana" : "Mês"}</button>
                    ))}
                    <button onClick={() => setChartType("area")} className={chip(chartType === "area")} title="Área"><AreaIcon size={13} /></button>
                    <button onClick={() => setChartType("bar")} className={chip(chartType === "bar")} title="Barras"><BarChart3 size={13} /></button>
                  </div>
                </div>
                <MainChart rows={rows} metric={metric} type={chartType} />
              </div>

              <RingsCard metric={metric} a={metricTotal(metric, data.a.summary)} b={metricTotal(metric, data.b.summary)} labelA={labelA} labelB={labelB} headline={story.headline} />
            </div>

            {/* De onde vem + dia da semana */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <BreakdownCard bd={bd} labelA={labelA} labelB={labelB} lowerIsBetter={metric === "expenses"} />
              <WeekdayCard data={data} metric={metric} labelA={labelA} labelB={labelB} />
            </div>

            {/* Resumo */}
            {story.lines.length > 0 && (
              <div className={`${card} p-5 overflow-hidden`}>
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-2xl pointer-events-none" />
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 flex items-center gap-1.5"><Sparkles size={15} className="text-fuchsia-500" /> Resumo</h2>
                <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                  {story.lines.map((l, i) => <li key={i} className="flex gap-2"><span className="text-fuchsia-500">•</span>{l}</li>)}
                </ul>
              </div>
            )}
            </>)}
          </div>
        )}
      </div>
    </PlanGate>
  )
}

// ── Peças ─────────────────────────────────────────────────────────────────────

function PeriodPicker({ color, letter, from, to, onFrom, onTo, name, onName }: {
  color: string; letter: string; from: string; to: string
  onFrom: (e: React.ChangeEvent<HTMLInputElement>) => void
  onTo: (e: React.ChangeEvent<HTMLInputElement>) => void
  name: string; onName: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl p-2.5" style={{ background: `${color}12`, border: `1px solid ${color}45` }}>
      <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: color, boxShadow: `0 0 14px ${color}80` }}>{letter}</span>
      <input type="date" value={from} onChange={onFrom} className={inputCls} />
      <span className="text-gray-400 text-xs">até</span>
      <input type="date" value={to} onChange={onTo} className={inputCls} />
      <input value={name} onChange={(e) => onName(e.target.value)} placeholder="Nome (ex.: Agosto)"
        className={`${inputCls} flex-1 min-w-[120px] placeholder-gray-400`} maxLength={30} />
    </div>
  )
}

function Legend({ labelA, labelB }: { labelA: string; labelB: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: A_COLOR, boxShadow: `0 0 6px ${A_COLOR}` }} />{labelA}</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: B_COLOR, boxShadow: `0 0 6px ${B_COLOR}` }} />{labelB}</span>
    </div>
  )
}

/** Anel com a variação (preenche até 100%). */
function ProgressRing({ pct, color, size = 64 }: { pct: number | null; color: string; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const fillPct = pct === null ? 100 : Math.min(100, Math.abs(pct))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-gray-100 dark:text-white/10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - fillPct / 100)} style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dashoffset .7s" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-800 dark:text-white">{formatPct(pct)}</span>
    </div>
  )
}

function MetricCard({ metric, active, onClick, a, b }: { metric: Metric; active: boolean; onClick: () => void; a: number; b: number }) {
  const diff = b - a
  const t = trend(diff, LOWER_IS_BETTER[metric])
  const ringColor = t === "good" ? "#10b981" : t === "bad" ? "#f43f5e" : "#a1a1aa"
  const meta = METRIC_META[metric]
  return (
    <button onClick={onClick}
      className={`${card} w-full h-full p-4 text-left transition-all hover:-translate-y-0.5 ${active ? "ring-2 ring-fuchsia-500/70 shadow-[0_0_28px_rgba(217,70,239,0.25)]" : "opacity-90 hover:opacity-100"}`}>
      {active && <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent" />}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-8 h-8 rounded-xl bg-gradient-to-br ${meta.grad} text-white flex items-center justify-center shadow-md`}>{meta.icon}</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{METRIC_LABELS[metric]}</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{formatMetric(metric, b)}</p>
          <p className="text-[11px] text-gray-400 truncate">antes: {formatMetric(metric, a)}</p>
        </div>
        <ProgressRing pct={diff === 0 ? 0 : pctChange(a, b)} color={ringColor} />
      </div>
    </button>
  )
}

function GradientDefs() {
  return (
    <defs>
      <linearGradient id="cmpAreaA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={A_COLOR} stopOpacity={0.45} />
        <stop offset="100%" stopColor={A_COLOR} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="cmpAreaB" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={B_COLOR} stopOpacity={0.5} />
        <stop offset="100%" stopColor={B_COLOR} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="cmpBarA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={A_LIGHT} />
        <stop offset="100%" stopColor={A_COLOR} />
      </linearGradient>
      <linearGradient id="cmpBarB" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={B_LIGHT} />
        <stop offset="100%" stopColor={B_COLOR} />
      </linearGradient>
    </defs>
  )
}

function ChartTip({ title, rows }: { title: string; rows: { color: string; label: string; value: string }[] }) {
  return (
    <div className="rounded-2xl p-3 min-w-[190px] text-xs bg-white/95 dark:bg-[#1a1530]/95 border border-purple-100 dark:border-[rgba(170,85,249,0.3)] shadow-xl backdrop-blur">
      <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">{title}</p>
      {rows.map((r, i) => (
        <p key={i} className="flex justify-between gap-4 mt-1">
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><span className="w-2 h-2 rounded-full" style={{ background: r.color }} />{r.label}</span>
          <b className="text-gray-900 dark:text-white">{r.value}</b>
        </p>
      ))}
    </div>
  )
}

function MainChart({ rows, metric, type }: { rows: AlignedRow[]; metric: Metric; type: "area" | "bar" }) {
  const chartData = rows.map((r) => ({
    label: r.label.replace("Dia ", "").replace("Semana ", "Sem "),
    full: r.label,
    a: r.a ? r.a[metric] : null,
    b: r.b ? r.b[metric] : null,
    aDates: r.a?.dates ?? "—",
    bDates: r.b?.dates ?? "—",
  }))
  const yFmt = (v: number) => (metric === "sessions" ? String(v) : shortMoney(v))
  const tip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof chartData)[number]
    return <ChartTip title={p.full} rows={[
      { color: A_COLOR, label: p.aDates, value: p.a === null ? "—" : formatMetric(metric, p.a) },
      { color: B_COLOR, label: p.bDates, value: p.b === null ? "—" : formatMetric(metric, p.b) },
    ]} />
  }
  const axes = (
    <>
      <GradientDefs />
      <CartesianGrid strokeDasharray="4 6" stroke="rgba(150,150,190,0.15)" vertical={false} />
      <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} dy={8} interval="preserveStartEnd" />
      <YAxis tickFormatter={yFmt} tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} width={56} allowDecimals={metric !== "sessions"} />
      <Tooltip content={tip} cursor={{ stroke: "rgba(217,70,239,0.35)", strokeDasharray: "4 4", fill: "rgba(217,70,239,0.05)" }} />
    </>
  )
  return (
    <div className="mt-4">
      <ResponsiveContainer width="100%" height={290}>
        {type === "area" ? (
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {axes}
            <Area type="monotone" dataKey="a" stroke={A_COLOR} strokeWidth={2.5} fill="url(#cmpAreaA)" dot={false}
              activeDot={{ r: 5, fill: A_COLOR, stroke: "#fff", strokeWidth: 2 }} style={{ filter: `drop-shadow(0 0 6px ${A_COLOR}90)` }} />
            <Area type="monotone" dataKey="b" stroke={B_COLOR} strokeWidth={2.8} fill="url(#cmpAreaB)" dot={false}
              activeDot={{ r: 5, fill: B_COLOR, stroke: "#fff", strokeWidth: 2 }} style={{ filter: `drop-shadow(0 0 6px ${B_COLOR}90)` }} />
          </AreaChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={3}>
            {axes}
            <Bar dataKey="a" fill="url(#cmpBarA)" radius={[6, 6, 0, 0]} maxBarSize={20} />
            <Bar dataKey="b" fill="url(#cmpBarB)" radius={[6, 6, 0, 0]} maxBarSize={20} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function RingsCard({ metric, a, b, labelA, labelB, headline }: { metric: Metric; a: number; b: number; labelA: string; labelB: string; headline: string }) {
  const diff = b - a
  const t = trend(diff, LOWER_IS_BETTER[metric])
  const max = Math.max(Math.abs(a), Math.abs(b), 1)
  const ringData = [
    { name: "A", value: (Math.max(0, a) / max) * 100, fill: A_COLOR },
    { name: "B", value: (Math.max(0, b) / max) * 100, fill: B_COLOR },
  ]
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
  const tone = t === "good" ? "text-emerald-500" : t === "bad" ? "text-rose-500" : "text-gray-400"
  return (
    <div className={`${card} p-6 flex flex-col overflow-hidden`}>
      <div className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
      <h2 className="font-semibold text-gray-900 dark:text-white">{METRIC_LABELS[metric]}: A x B</h2>
      <div className="relative h-52 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={ringData} innerRadius="58%" outerRadius="100%" startAngle={90} endAngle={-270} barSize={14}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "rgba(150,150,190,0.12)" }} style={{ filter: "drop-shadow(0 0 5px rgba(217,70,239,0.45))" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <Icon size={18} className={tone} />
          <p className={`text-2xl font-extrabold ${tone}`}>{diff === 0 ? "0%" : formatPct(pctChange(a, b))}</p>
          <p className="text-[11px] text-gray-400">{diff === 0 ? "igual" : `${diff > 0 ? "+" : "-"}${formatMetric(metric, Math.abs(diff))}`}</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <p className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 truncate"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: A_COLOR }} />{labelA}</span><b className="text-gray-900 dark:text-white">{formatMetric(metric, a)}</b></p>
        <p className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 truncate"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: B_COLOR }} />{labelB}</span><b className="text-gray-900 dark:text-white">{formatMetric(metric, b)}</b></p>
      </div>
      <p className="mt-4 pt-3 border-t border-purple-50 dark:border-white/5 text-sm text-gray-700 dark:text-gray-200 leading-snug">{headline}</p>
    </div>
  )
}

function Donut({ items, which, color, label, kind }: { items: Breakdown["items"]; which: "a" | "b"; color: string; label: string; kind: Breakdown["kind"] }) {
  const values = items.map((i) => ({ name: i.name, value: Math.max(0, i[which]) }))
  const total = values.reduce((s, v) => s + v.value, 0)
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        {total === 0 ? (
          <div className="w-full h-full rounded-full border-[10px] border-dashed border-gray-100 dark:border-white/10" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={values} dataKey="value" innerRadius="70%" outerRadius="100%" paddingAngle={3} strokeWidth={0} cornerRadius={6}>
                {values.map((_, i) => <Cell key={i} fill={DONUT[i % DONUT.length]} style={{ filter: `drop-shadow(0 0 4px ${DONUT[i % DONUT.length]}70)` }} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold px-1.5 rounded text-white" style={{ background: color }}>{which.toUpperCase()}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white mt-1">{kind === "count" ? num(total) : shortMoney(total)}</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2 max-w-[160px] truncate">{label}</p>
    </div>
  )
}

function BreakdownCard({ bd, labelA, labelB, lowerIsBetter }: { bd: Breakdown; labelA: string; labelB: string; lowerIsBetter: boolean }) {
  const fmt = (v: number) => (bd.kind === "count" ? num(v) : brl(v))
  const empty = bd.items.every((i) => i.a === 0 && i.b === 0)
  const isProfit = bd.title.startsWith("Receita, despesas")
  const max = Math.max(1, ...bd.items.flatMap((i) => [Math.abs(i.a), Math.abs(i.b)]))

  return (
    <div className={`${card} p-6 lg:col-span-2`}>
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{bd.title}</h2>
      {empty ? (
        <p className="text-sm text-gray-400 py-12 text-center">Nada registrado nos dois períodos</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
          {!isProfit && (
            <div className="flex justify-center gap-4">
              <Donut items={bd.items} which="a" color={A_COLOR} label={labelA} kind={bd.kind} />
              <Donut items={bd.items} which="b" color={B_COLOR} label={labelB} kind={bd.kind} />
            </div>
          )}
          <div className={`space-y-3.5 ${isProfit ? "md:col-span-2" : ""}`}>
            {bd.items.map((it, i) => {
              const d = it.b - it.a
              const tr = trend(d, lowerIsBetter || it.name === "Despesas")
              return (
                <div key={it.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 truncate">
                      {!isProfit && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT[i % DONUT.length] }} />}
                      <span className="truncate" title={it.name}>{it.name}</span>
                    </span>
                    <span className={`text-xs font-semibold shrink-0 ml-2 ${tr === "good" ? "text-emerald-500" : tr === "bad" ? "text-rose-500" : "text-gray-400"}`}>
                      {d === 0 ? "igual" : `${d > 0 ? "+" : "-"}${fmt(Math.abs(d))}`}
                    </span>
                  </div>
                  {([["a", it.a, A_COLOR, A_LIGHT], ["b", it.b, B_COLOR, B_LIGHT]] as const).map(([k, v, c, l]) => (
                    <div key={k} className="flex items-center gap-2 mt-1" title={`${k === "a" ? labelA : labelB}: ${fmt(v)}`}>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(Math.max(0, v) / max) * 100}%`, background: `linear-gradient(90deg, ${c}, ${l})`, boxShadow: `0 0 8px ${c}80` }} />
                      </div>
                      <span className="text-[11px] text-gray-400 w-20 text-right">{fmt(v)}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function WeekdayCard({ data, metric, labelA, labelB }: { data: CompareData; metric: Metric; labelA: string; labelB: string }) {
  const wa = weekdayTotals(data.a.days, metric)
  const wb = weekdayTotals(data.b.days, metric)
  const chartData = WEEKDAY_ORDER.map((d, i) => ({ day: d, a: Math.max(0, wa[i]), b: Math.max(0, wb[i]), ra: wa[i], rb: wb[i] }))
  const bestB = chartData.reduce((best, d) => (d.rb > best.rb ? d : best), chartData[0])
  const tip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof chartData)[number]
    return <ChartTip title={p.day} rows={[
      { color: A_COLOR, label: labelA, value: formatMetric(metric, p.ra) },
      { color: B_COLOR, label: labelB, value: formatMetric(metric, p.rb) },
    ]} />
  }
  return (
    <div className={`${card} p-6`}>
      <h2 className="font-semibold text-gray-900 dark:text-white">Por dia da semana</h2>
      <p className="text-xs text-gray-400 mt-0.5">
        {bestB.rb > 0 ? <>Em {labelB}, o dia mais forte foi <b className="text-fuchsia-500">{bestB.day}</b></> : "Sem movimento em B"}
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={chartData} outerRadius="72%">
          <defs>
            <radialGradient id="cmpRadarB"><stop offset="0%" stopColor={B_LIGHT} stopOpacity={0.7} /><stop offset="100%" stopColor={B_COLOR} stopOpacity={0.35} /></radialGradient>
            <radialGradient id="cmpRadarA"><stop offset="0%" stopColor={A_LIGHT} stopOpacity={0.6} /><stop offset="100%" stopColor={A_COLOR} stopOpacity={0.25} /></radialGradient>
          </defs>
          <PolarGrid stroke="rgba(150,150,190,0.25)" />
          <PolarAngleAxis dataKey="day" tick={{ ...axisTick, fontSize: 12 }} />
          <PolarRadiusAxis tick={false} axisLine={false} />
          <Tooltip content={tip} />
          <Radar dataKey="a" stroke={A_COLOR} strokeWidth={2} fill="url(#cmpRadarA)" />
          <Radar dataKey="b" stroke={B_COLOR} strokeWidth={2.5} fill="url(#cmpRadarB)" style={{ filter: `drop-shadow(0 0 6px ${B_COLOR}80)` }} />
        </RadarChart>
      </ResponsiveContainer>
      <Legend labelA={labelA} labelB={labelB} />
    </div>
  )
}

// ── Clientes: novas únicas, novas que voltaram, recorrentes ───────────────────

const GROUP_ICONS = { newOnce: <Star size={16} />, newRepeat: <UserPlus size={16} />, recurring: <Repeat size={16} /> }

function ClientsCard({ active, onClick, a, b }: { active: boolean; onClick: () => void; a: number; b: number }) {
  const diff = b - a
  const t = trend(diff)
  const ringColor = t === "good" ? "#10b981" : t === "bad" ? "#f43f5e" : "#a1a1aa"
  return (
    <button onClick={onClick}
      className={`${card} w-full h-full p-4 text-left transition-all hover:-translate-y-0.5 ${active ? "ring-2 ring-fuchsia-500/70 shadow-[0_0_28px_rgba(217,70,239,0.25)]" : "opacity-90 hover:opacity-100"}`}>
      {active && <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent" />}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 text-white flex items-center justify-center shadow-md"><HeartHandshake size={17} /></span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Clientes</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{num(b)}</p>
          <p className="text-[11px] text-gray-400">antes: {num(a)}</p>
        </div>
        <ProgressRing pct={diff === 0 ? 0 : pctChange(a, b)} color={ringColor} />
      </div>
    </button>
  )
}

/** Barra 100% empilhada: quanto da receita veio de cada grupo. */
function ShareBar({ mix, label, letter, color }: { mix: ClientMix; label: string; letter: string; color: string }) {
  const { revenue } = mixTotals(mix)
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 truncate">
          <span className="text-[10px] font-bold px-1.5 rounded text-white" style={{ background: color }}>{letter}</span>{label}
        </span>
        <span className="text-gray-400 shrink-0">{brl(revenue)}</span>
      </div>
      <div className="flex h-9 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5">
        {revenue > 0 && CLIENT_GROUPS.map((g) => {
          const p = revenueShare(mix, g.key)
          if (p <= 0) return null
          return (
            <div key={g.key} className="h-full flex items-center justify-center text-[11px] font-bold text-white transition-all duration-700"
              style={{ width: `${p}%`, background: `linear-gradient(180deg, ${g.light}, ${g.color})` }}
              title={`${g.label}: ${num(p)}% (${brl(mix[g.key].revenue)})`}>
              {p >= 8 ? `${num(p)}%` : ""}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ClientsView({ data, labelA, labelB }: { data: CompareData; labelA: string; labelB: string }) {
  const A = data.a.clientMix, B = data.b.clientMix
  const story = clientStory(data, labelA, labelB)
  const countData = CLIENT_GROUPS.map((g) => ({ name: g.short, a: A[g.key].clients, b: B[g.key].clients }))
  const donutB = CLIENT_GROUPS.map((g) => ({ name: g.label, value: B[g.key].revenue, color: g.color }))
  const totalB = mixTotals(B)

  const tip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof countData)[number]
    return <ChartTip title={p.name} rows={[
      { color: A_COLOR, label: labelA, value: `${num(p.a)} cliente${p.a === 1 ? "" : "s"}` },
      { color: B_COLOR, label: labelB, value: `${num(p.b)} cliente${p.b === 1 ? "" : "s"}` },
    ]} />
  }

  return (
    <div className="space-y-5">
      {/* Os 3 grupos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CLIENT_GROUPS.map((g) => {
          const a = A[g.key].clients, b = B[g.key].clients
          return (
            <div key={g.key} className={`${card} p-5 overflow-hidden`}>
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: `${g.color}22` }} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl text-white flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${g.light}, ${g.color})`, boxShadow: `0 0 14px ${g.color}66` }}>{GROUP_ICONS[g.key]}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{g.label}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{g.hint}</p>
                </div>
                <ProgressRing pct={a === b ? 0 : pctChange(a, b)} color={g.color} size={58} />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white leading-none">{num(b)}</p>
                  <p className="text-[11px] text-gray-400 mt-1">antes: {num(a)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: g.color }}>{num(revenueShare(B, g.key))}%</p>
                  <p className="text-[11px] text-gray-400">da receita (antes {num(revenueShare(A, g.key))}%)</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* De onde veio a receita */}
        <div className={`${card} p-6 lg:col-span-2`}>
          <h2 className="font-semibold text-gray-900 dark:text-white">De onde veio a receita</h2>
          <div className="flex flex-wrap gap-4 mt-1 mb-5 text-xs text-gray-500 dark:text-gray-400">
            {CLIENT_GROUPS.map((g) => (
              <span key={g.key} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />{g.label}</span>
            ))}
          </div>
          <div className="space-y-4">
            <ShareBar mix={A} label={labelA} letter="A" color={A_COLOR} />
            <ShareBar mix={B} label={labelB} letter="B" color={B_COLOR} />
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mt-7">Quantas clientes em cada grupo</h3>
          <Legend labelA={labelA} labelB={labelB} />
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={countData} margin={{ top: 14, right: 10, left: 0, bottom: 0 }} barGap={4}>
              <GradientDefs />
              <CartesianGrid strokeDasharray="4 6" stroke="rgba(150,150,190,0.15)" vertical={false} />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} dy={6} />
              <YAxis tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} width={34} allowDecimals={false} />
              <Tooltip content={tip} cursor={{ fill: "rgba(217,70,239,0.05)" }} />
              <Bar dataKey="a" fill="url(#cmpBarA)" radius={[6, 6, 0, 0]} maxBarSize={42} label={{ position: "top", fontSize: 11, fill: A_COLOR }} />
              <Bar dataKey="b" fill="url(#cmpBarB)" radius={[6, 6, 0, 0]} maxBarSize={42} label={{ position: "top", fontSize: 11, fill: B_COLOR }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rosca da receita de B */}
        <div className={`${card} p-6 flex flex-col`}>
          <h2 className="font-semibold text-gray-900 dark:text-white">Receita de {labelB}</h2>
          <p className="text-xs text-gray-400 mt-0.5">dividida pelos 3 grupos</p>
          <div className="relative h-52 my-3">
            {totalB.revenue === 0 ? (
              <div className="w-40 h-40 mx-auto mt-6 rounded-full border-[12px] border-dashed border-gray-100 dark:border-white/10" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutB} dataKey="value" innerRadius="66%" outerRadius="95%" paddingAngle={3} strokeWidth={0} cornerRadius={8}>
                    {donutB.map((d, i) => <Cell key={i} fill={d.color} style={{ filter: `drop-shadow(0 0 5px ${d.color}80)` }} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{num(totalB.clients)}</p>
              <p className="text-[11px] text-gray-400">clientes</p>
            </div>
          </div>
          <div className="space-y-2 mt-auto">
            {CLIENT_GROUPS.map((g) => (
              <div key={g.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />{g.label}</span>
                <b className="text-gray-900 dark:text-white">{brl(B[g.key].revenue)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className={`${card} p-5 overflow-hidden`}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-2xl pointer-events-none" />
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 flex items-center gap-1.5"><Sparkles size={15} className="text-fuchsia-500" /> Resumo</h2>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1.5">{story.headline}</p>
        <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          {story.lines.map((l, i) => <li key={i} className="flex gap-2"><span className="text-fuchsia-500">•</span>{l}</li>)}
        </ul>
      </div>
    </div>
  )
}

// ── Valor por hora trabalhada ─────────────────────────────────────────────────

function HourCard({ active, onClick, a, b }: { active: boolean; onClick: () => void; a: number; b: number }) {
  const diff = b - a
  const t = trend(diff)
  const ringColor = t === "good" ? "#10b981" : t === "bad" ? "#f43f5e" : "#a1a1aa"
  return (
    <button onClick={onClick}
      className={`${card} w-full h-full p-4 text-left transition-all hover:-translate-y-0.5 ${active ? "ring-2 ring-fuchsia-500/70 shadow-[0_0_28px_rgba(217,70,239,0.25)]" : "opacity-90 hover:opacity-100"}`}>
      {active && <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent" />}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-violet-500 text-white flex items-center justify-center shadow-md"><Clock size={17} /></span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Valor por hora</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{brl(b)}</p>
          <p className="text-[11px] text-gray-400 truncate">antes: {brl(a)}</p>
        </div>
        <ProgressRing pct={diff === 0 ? 0 : pctChange(a, b)} color={ringColor} />
      </div>
    </button>
  )
}

function StatTile({ icon, grad, title, a, b, fmt }: { icon: React.ReactNode; grad: string; title: string; a: number; b: number; fmt: (v: number) => string }) {
  const diff = b - a
  const t = trend(diff)
  const ringColor = t === "good" ? "#10b981" : t === "bad" ? "#f43f5e" : "#a1a1aa"
  return (
    <div className={`${card} p-5 overflow-hidden`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-8 h-8 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-md`}>{icon}</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{fmt(b)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">antes: {fmt(a)}</p>
        </div>
        <ProgressRing pct={diff === 0 ? 0 : pctChange(a, b)} color={ringColor} size={60} />
      </div>
    </div>
  )
}

function HourlyView({ data, labelA, labelB, grouping }: { data: CompareData; labelA: string; labelB: string; grouping: Grouping }) {
  const A = data.a.summary, B = data.b.summary
  const story = hourStory(data, labelA, labelB)
  const rows = alignPeriods(data.a.days, data.b.days, grouping)
  const chartData = rows.map((r) => ({
    label: r.label.replace("Dia ", "").replace("Semana ", "Sem "),
    full: r.label,
    a: r.a ? Math.round(r.a.hours * 100) / 100 : null,
    b: r.b ? Math.round(r.b.hours * 100) / 100 : null,
    aDates: r.a?.dates ?? "—",
    bDates: r.b?.dates ?? "—",
  }))
  const wa = [0, 0, 0, 0, 0, 0, 0], wb = [0, 0, 0, 0, 0, 0, 0]
  const wdIndex = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 }
  for (const d of data.a.days) wa[wdIndex(d.date)] += d.hours
  for (const d of data.b.days) wb[wdIndex(d.date)] += d.hours
  const radar = WEEKDAY_ORDER.map((day, i) => ({ day, a: Math.round(wa[i] * 10) / 10, b: Math.round(wb[i] * 10) / 10 }))

  const max = Math.max(A.revenuePerHour, B.revenuePerHour, 1)
  const ringData = [
    { name: "A", value: (Math.max(0, A.revenuePerHour) / max) * 100, fill: A_COLOR },
    { name: "B", value: (Math.max(0, B.revenuePerHour) / max) * 100, fill: B_COLOR },
  ]
  const diff = B.revenuePerHour - A.revenuePerHour
  const tone = trend(diff) === "good" ? "text-emerald-500" : trend(diff) === "bad" ? "text-rose-500" : "text-gray-400"
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus

  const tip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof chartData)[number]
    return <ChartTip title={p.full} rows={[
      { color: A_COLOR, label: p.aDates, value: p.a === null ? "—" : formatHours(p.a) },
      { color: B_COLOR, label: p.bDates, value: p.b === null ? "—" : formatHours(p.b) },
    ]} />
  }
  const radarTip = ({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as (typeof radar)[number]
    return <ChartTip title={p.day} rows={[
      { color: A_COLOR, label: labelA, value: formatHours(p.a) },
      { color: B_COLOR, label: labelB, value: formatHours(p.b) },
    ]} />
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile icon={<Clock size={16} />} grad="from-teal-400 to-cyan-500" title="Horas trabalhadas" a={A.hoursWorked} b={B.hoursWorked} fmt={formatHours} />
        <StatTile icon={<DollarSign size={16} />} grad="from-violet-500 to-fuchsia-500" title="Faturamento por hora" a={A.revenuePerHour} b={B.revenuePerHour} fmt={brl} />
        <StatTile icon={<Wallet size={16} />} grad="from-emerald-500 to-teal-500" title="Lucro por hora" a={A.profitPerHour} b={B.profitPerHour} fmt={brl} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Anéis: valor da hora */}
        <div className={`${card} p-6 flex flex-col overflow-hidden`}>
          <div className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Quanto vale a sua hora</h2>
          <div className="relative h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart data={ringData} innerRadius="58%" outerRadius="100%" startAngle={90} endAngle={-270} barSize={14}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "rgba(150,150,190,0.12)" }} style={{ filter: "drop-shadow(0 0 5px rgba(217,70,239,0.45))" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <Icon size={18} className={tone} />
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{brl(B.revenuePerHour)}</p>
              <p className={`text-[11px] font-semibold ${tone}`}>{diff === 0 ? "igual" : formatPct(pctChange(A.revenuePerHour, B.revenuePerHour))}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 truncate"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: A_COLOR }} />{labelA}</span><b className="text-gray-900 dark:text-white">{brl(A.revenuePerHour)}/h</b></p>
            <p className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-500 dark:text-gray-400 truncate"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: B_COLOR }} />{labelB}</span><b className="text-gray-900 dark:text-white">{brl(B.revenuePerHour)}/h</b></p>
          </div>
          <p className="mt-4 pt-3 border-t border-purple-50 dark:border-white/5 text-sm text-gray-700 dark:text-gray-200 leading-snug">{story.headline}</p>
        </div>

        {/* Horas por dia */}
        <div className={`${card} p-6 lg:col-span-2`}>
          <h2 className="font-semibold text-gray-900 dark:text-white">Horas trabalhadas {GROUPING_LABELS[grouping].toLowerCase()}</h2>
          <Legend labelA={labelA} labelB={labelB} />
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={3}>
                <GradientDefs />
                <CartesianGrid strokeDasharray="4 6" stroke="rgba(150,150,190,0.15)" vertical={false} />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} dy={8} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v: number) => `${v}h`} tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={tip} cursor={{ fill: "rgba(217,70,239,0.05)" }} />
                <Bar dataKey="a" fill="url(#cmpBarA)" radius={[6, 6, 0, 0]} maxBarSize={20} />
                <Bar dataKey="b" fill="url(#cmpBarB)" radius={[6, 6, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Conta o tempo dos atendimentos e os intervalos de até 15 min. Intervalos maiores são descanso.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} p-6`}>
          <h2 className="font-semibold text-gray-900 dark:text-white">Horas por dia da semana</h2>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radar} outerRadius="72%">
              <defs>
                <radialGradient id="cmpRadarHB"><stop offset="0%" stopColor={B_LIGHT} stopOpacity={0.7} /><stop offset="100%" stopColor={B_COLOR} stopOpacity={0.35} /></radialGradient>
                <radialGradient id="cmpRadarHA"><stop offset="0%" stopColor={A_LIGHT} stopOpacity={0.6} /><stop offset="100%" stopColor={A_COLOR} stopOpacity={0.25} /></radialGradient>
              </defs>
              <PolarGrid stroke="rgba(150,150,190,0.25)" />
              <PolarAngleAxis dataKey="day" tick={{ ...axisTick, fontSize: 12 }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Tooltip content={radarTip} />
              <Radar dataKey="a" stroke={A_COLOR} strokeWidth={2} fill="url(#cmpRadarHA)" />
              <Radar dataKey="b" stroke={B_COLOR} strokeWidth={2.5} fill="url(#cmpRadarHB)" style={{ filter: `drop-shadow(0 0 6px ${B_COLOR}80)` }} />
            </RadarChart>
          </ResponsiveContainer>
          <Legend labelA={labelA} labelB={labelB} />
        </div>

        <div className={`${card} p-5 lg:col-span-2 overflow-hidden`}>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-2xl pointer-events-none" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 flex items-center gap-1.5"><Sparkles size={15} className="text-fuchsia-500" /> Resumo</h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {story.lines.map((l, i) => <li key={i} className="flex gap-2"><span className="text-fuchsia-500">•</span>{l}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}
