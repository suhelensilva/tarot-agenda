"use client"

import { useEffect, useState, useCallback } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Pencil, X, Check, Calendar,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { PlanGate } from "@/components/plan-gate"

// ── Types ─────────────────────────────────────────────────────────────────────

type Period     = "week" | "month" | "semester" | "year" | "custom"
type Summary    = { totalRevenue: number; totalExpenses: number; profit: number; profitMargin: number; revenueDelta: number | null; expensesDelta: number | null }
type ChartPoint = { label: string; revenue: number; expenses: number; profit: number }
type ExpenseCat = { category: string; amount: number }
type Transaction = { id: string; type: "revenue" | "expense"; description: string; category: string; amount: number; date: string }
type ClientStat  = { id: string; name: string; sessions: number; totalRevenue: number }
type Expense     = { id: string; description: string; category: string; amount: number; date: string }
type ReportData  = { summary: Summary; chartData: ChartPoint[]; expenseBreakdown: ExpenseCat[]; transactions: Transaction[]; clientStats: ClientStat[] }

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = { week: "Semanal", month: "Mensal", semester: "Semestral", year: "Anual", custom: "Personalizado" }

const EXPENSE_CATEGORIES = ["Aluguel","Taxa de plataforma","Taxa de cartão","Marketing","Materiais","Cursos / Formação","Transporte","Internet","Outros"]

const PIE_COLORS = ["#a855f7","#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#14b8a6"]

// ── Tooltip customizado ───────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const labels: Record<string, string> = { revenue: "Receita", expenses: "Despesas", profit: "Lucro" }
  return (
    <div className="bg-[#1a1a2e] border border-[rgba(170,85,249,0.3)] rounded-xl p-3 shadow-xl min-w-[140px]">
      <p className="text-xs text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-300">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            {labels[p.name] ?? p.name}
          </span>
          <span className="text-xs font-bold text-white">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── DonutTooltip ──────────────────────────────────────────────────────────────

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-[rgba(170,85,249,0.3)] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400">{payload[0].name}</p>
      <p className="text-sm font-bold text-white">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [period, setPeriod]     = useState<Period>("month")
  const [customFrom, setFrom]   = useState("")
  const [customTo, setTo]       = useState("")
  const [data, setData]         = useState<ReportData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [showExpForm, setExpForm] = useState(false)
  const [editingExp, setEditExp]  = useState<Expense | null>(null)

  const [expDesc, setExpDesc] = useState("")
  const [expCat, setExpCat]   = useState("Outros")
  const [expAmt, setExpAmt]   = useState("")
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [savingExp, setSavExp] = useState(false)

  const buildUrl = useCallback(() => {
    let url = `/api/relatorios?period=${period}`
    if (period === "custom" && customFrom && customTo) url += `&from=${customFrom}&to=${customTo}`
    return url
  }, [period, customFrom, customTo])

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch(buildUrl()); setData(await r.json()) }
    finally { setLoading(false) }
  }, [buildUrl])

  useEffect(() => { if (period !== "custom") load() }, [period, load])

  function openNewExp() {
    setEditExp(null); setExpDesc(""); setExpCat("Outros")
    setExpAmt(""); setExpDate(new Date().toISOString().slice(0, 10)); setExpForm(true)
  }
  function openEditExp(e: Expense) {
    setEditExp(e); setExpDesc(e.description); setExpCat(e.category)
    setExpAmt(String(e.amount)); setExpDate(e.date.slice(0, 10)); setExpForm(true)
  }
  async function handleSaveExp(ev: React.FormEvent) {
    ev.preventDefault(); setSavExp(true)
    const body = { description: expDesc, category: expCat, amount: parseFloat(expAmt.replace(",",".")), date: expDate }
    if (editingExp) await fetch(`/api/despesas/${editingExp.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    else await fetch("/api/despesas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSavExp(false); setExpForm(false); load()
  }
  async function handleDeleteExp(id: string) {
    if (!confirm("Remover despesa?")) return
    await fetch(`/api/despesas/${id}`, { method: "DELETE" }); load()
  }

  return (
    <PlanGate feature="relatorios" message="Relatórios e métricas estão disponíveis a partir do plano Pró.">
      <div className="p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatório Financeiro</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Acompanhe receitas, despesas e lucro</p>
          </div>
          <button onClick={openNewExp}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <Plus size={15} /> Registrar despesa
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                period === p
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] text-gray-600 dark:text-gray-400 hover:border-purple-300 dark:hover:border-[rgba(170,85,249,0.4)]"
              }`}>{PERIOD_LABELS[p]}</button>
          ))}
          {period === "custom" && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={customFrom} onChange={(e) => setFrom(e.target.value)}
                className="border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[#13131f] dark:text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <span className="text-gray-400 text-sm">até</span>
              <input type="date" value={customTo} onChange={(e) => setTo(e.target.value)}
                className="border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[#13131f] dark:text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <button onClick={load} disabled={!customFrom || !customTo}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-semibold">Buscar</button>
            </div>
          )}
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center h-60">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* ── 4 Cards gradiente ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <GradCard label="Receita total"      value={formatCurrency(data.summary.totalRevenue)}  delta={data.summary.revenueDelta}  gradient="from-teal-400 via-cyan-400 to-sky-500"        icon={<DollarSign size={18}/>} />
              <GradCard label="Entradas"           value={`${data.transactions.filter(t=>t.type==="revenue").length} sessões`} subValue={formatCurrency(data.summary.totalRevenue)} gradient="from-violet-400 via-purple-500 to-indigo-500" icon={<ArrowUpRight size={18}/>} />
              <GradCard label="Saídas"             value={formatCurrency(data.summary.totalExpenses)} delta={data.summary.expensesDelta} deltaInvert gradient="from-rose-400 via-pink-500 to-fuchsia-500"   icon={<ArrowDownRight size={18}/>} />
              <GradCard label="Lucro líquido"      value={formatCurrency(data.summary.profit)}        subValue={`Margem ${data.summary.profitMargin.toFixed(1)}%`} gradient="from-amber-400 via-orange-400 to-rose-400" icon={<TrendingUp size={18}/>} />
            </div>

            {/* ── Linha 2: área grande + donut ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* AreaChart — 2/3 */}
              <div className="lg:col-span-2 bg-white dark:bg-[#0f0f1a] border border-gray-100 dark:border-[rgba(170,85,249,0.12)] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white text-base">Faturamento</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Receita, despesas e lucro no período</p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block"/>Receita</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"/>Despesas</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"/>Lucro</span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45}/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradProf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,180,0.08)" vertical={false}/>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(150,150,180,0.6)" }} axisLine={false} tickLine={false} dy={6}/>
                    <YAxis tickFormatter={(v) => v === 0 ? "0" : `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "rgba(150,150,180,0.5)" }} axisLine={false} tickLine={false} width={48}/>
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(170,85,249,0.3)", strokeWidth: 1, strokeDasharray: "4 4" }}/>
                    <Area type="monotone" dataKey="revenue"  stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradRev)"  dot={false} activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}/>
                    <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2}   fill="url(#gradExp)"  dot={false} activeDot={{ r: 4, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }} strokeDasharray="6 3"/>
                    <Area type="monotone" dataKey="profit"   stroke="#34d399" strokeWidth={2}   fill="url(#gradProf)" dot={false} activeDot={{ r: 4, fill: "#34d399", stroke: "#fff", strokeWidth: 2 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Donut — 1/3 */}
              <div className="bg-white dark:bg-[#0f0f1a] border border-gray-100 dark:border-[rgba(170,85,249,0.12)] rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white text-base">Despesas</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Por categoria</p>
                </div>

                {data.expenseBreakdown.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2">
                    <div className="w-16 h-16 rounded-full border-4 border-dashed border-gray-200 dark:border-gray-700" />
                    <p className="text-xs text-center">Nenhuma despesa<br/>no período</p>
                  </div>
                ) : (
                  <DonutSection data={data.expenseBreakdown} total={data.summary.totalExpenses} />
                )}
              </div>
            </div>

            {/* ── Linha 3: margem + mini gauge ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Gauge de lucro */}
              <div className="bg-white dark:bg-[#0f0f1a] border border-gray-100 dark:border-[rgba(170,85,249,0.12)] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
                <h2 className="font-semibold text-gray-900 dark:text-white text-base mb-1 w-full">Margem de lucro</h2>
                <p className="text-xs text-gray-400 mb-4 w-full">Score do período</p>
                <GaugeChart value={Math.max(0, Math.min(100, data.summary.profitMargin))} />
              </div>

              {/* Barras composição — 2/3 */}
              <div className="lg:col-span-2 bg-white dark:bg-[#0f0f1a] border border-gray-100 dark:border-[rgba(170,85,249,0.12)] rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white text-base mb-1">Composição da receita</h2>
                <p className="text-xs text-gray-400 mb-5">Como a receita bruta se distribui</p>

                <div className="space-y-5">
                  <MarginBar label="Lucro líquido" value={data.summary.profit}        total={data.summary.totalRevenue} color="bg-gradient-to-r from-emerald-400 to-teal-500" colorText="text-emerald-500"/>
                  <MarginBar label="Despesas"      value={data.summary.totalExpenses} total={data.summary.totalRevenue} color="bg-gradient-to-r from-rose-400 to-pink-500"    colorText="text-rose-400"/>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 pt-5 border-t border-gray-100 dark:border-[rgba(170,85,249,0.08)]">
                  <MiniStat label="Receita bruta"  value={formatCurrency(data.summary.totalRevenue)}  color="text-violet-500"/>
                  <MiniStat label="Total despesas" value={formatCurrency(data.summary.totalExpenses)} color="text-rose-400"/>
                  <MiniStat label="Margem"         value={`${data.summary.profitMargin.toFixed(1)}%`} color="text-emerald-500"/>
                </div>
              </div>
            </div>

            {/* ── Linha 4: histórico + clientes ──────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Transações — 2/3 */}
              <div className="lg:col-span-2 bg-white dark:bg-[#0f0f1a] border border-gray-100 dark:border-[rgba(170,85,249,0.12)] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white text-base">Histórico</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Entradas e saídas no período</p>
                  </div>
                </div>

                {data.transactions.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-gray-400">
                    <p className="text-sm">Nenhuma transação no período</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center text-[11px] text-gray-400 dark:text-gray-500 font-medium pb-2.5 border-b border-gray-100 dark:border-[rgba(170,85,249,0.08)] gap-3 px-1 mb-1">
                      <span/>
                      <span>Descrição</span>
                      <span className="hidden sm:block">Categoria</span>
                      <span className="hidden sm:block">Data</span>
                      <span className="text-right">Valor</span>
                    </div>
                    {data.transactions.slice(0, 12).map((t) => (
                      <TxRow key={t.id} t={t}
                        onEdit={t.type==="expense" ? () => openEditExp(t as unknown as Expense) : undefined}
                        onDelete={t.type==="expense" ? () => handleDeleteExp(t.id) : undefined}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Top clientes — 1/3 */}
              <div className="bg-white dark:bg-[#0f0f1a] border border-gray-100 dark:border-[rgba(170,85,249,0.12)] rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 dark:text-white text-base mb-1">Top clientes</h2>
                <p className="text-xs text-gray-400 mb-4">No período selecionado</p>

                {data.clientStats.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-gray-400">
                    <p className="text-sm text-center">Nenhum cliente<br/>no período</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.clientStats.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: `linear-gradient(135deg, ${PIE_COLORS[i % PIE_COLORS.length]}33, ${PIE_COLORS[i % PIE_COLORS.length]}22)`, color: PIE_COLORS[i % PIE_COLORS.length] }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="flex-1 h-1 bg-gray-100 dark:bg-[rgba(255,255,255,0.07)] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${Math.min(100, (c.totalRevenue / (data.clientStats[0]?.totalRevenue || 1)) * 100)}%`,
                                  backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                                }}/>
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0">{c.sessions}x</span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">{formatCurrency(c.totalRevenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Modal despesa */}
      {showExpForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#13131f] dark:border dark:border-[rgba(170,85,249,0.15)] rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[rgba(170,85,249,0.1)]">
              <h2 className="font-semibold text-gray-900 dark:text-white">{editingExp ? "Editar despesa" : "Nova despesa"}</h2>
              <button onClick={() => setExpForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={17}/></button>
            </div>
            <form onSubmit={handleSaveExp} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição *</label>
                <input required value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Ex: Aluguel da sala"
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                  <select value={expCat} onChange={(e) => setExpCat(e.target.value)}
                    className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[#13131f] dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$) *</label>
                  <input required value={expAmt} onChange={(e) => setExpAmt(e.target.value)} placeholder="0,00" inputMode="decimal"
                    className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[#13131f] dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"/>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setExpForm(false)}
                  className="flex-1 border border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5">Cancelar</button>
                <button type="submit" disabled={savingExp}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {savingExp ? "Salvando…" : <><Check size={14}/> {editingExp ? "Salvar" : "Adicionar"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PlanGate>
  )
}

// ── GradCard ──────────────────────────────────────────────────────────────────

function GradCard({ label, value, subValue, delta, deltaInvert, gradient, icon }: {
  label: string; value: string; subValue?: string; delta?: number | null
  deltaInvert?: boolean; gradient: string; icon: React.ReactNode
}) {
  const isPositive = delta != null ? (deltaInvert ? delta < 0 : delta > 0) : null
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradient} text-white shadow-lg`}>
      <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/10"/>
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10"/>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white/80">{label}</p>
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">{icon}</div>
        </div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <div className="flex items-center justify-between mt-1.5 min-h-[18px]">
          {subValue && <p className="text-xs text-white/70">{subValue}</p>}
          {delta != null && (
            <div className="flex items-center gap-0.5 text-xs font-semibold text-white/90">
              {isPositive ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
              {Math.abs(delta).toFixed(1)}% vs ant.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DonutSection ──────────────────────────────────────────────────────────────

function DonutSection({ data, total }: { data: ExpenseCat[]; total: number }) {
  return (
    <div className="flex flex-col items-center gap-5 flex-1">
      <div className="relative w-44 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={72}
              paddingAngle={3} dataKey="amount" strokeWidth={0}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
            </Pie>
            <Tooltip content={<DonutTooltip/>}/>
          </PieChart>
        </ResponsiveContainer>
        {/* Centro do donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">Total</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 leading-tight">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className="w-full space-y-2">
        {data.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length]}}/>
            <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{d.category}</span>
            <span className="text-xs font-semibold text-gray-800 dark:text-white">{((d.amount/total)*100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── GaugeChart (SVG semicírculo) ──────────────────────────────────────────────

function GaugeChart({ value }: { value: number }) {
  // Semicírculo de -180° a 0° (arco de 180°)
  const R = 70; const CX = 90; const CY = 90
  const startAngle = Math.PI      // 180°
  const endAngle   = 0            // 0° (arco de 180°)
  const angle = startAngle - (value / 100) * Math.PI  // ponto atual

  function polarToXY(a: number) {
    return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }
  }

  const bgStart = polarToXY(startAngle)
  const bgEnd   = polarToXY(endAngle)
  const fgEnd   = polarToXY(angle)
  const needle  = polarToXY(angle)

  const score  = Math.round(value)
  const label  = value >= 70 ? "Excelente" : value >= 40 ? "Bom" : value >= 20 ? "Regular" : "Atenção"
  const color  = value >= 70 ? "#34d399" : value >= 40 ? "#a855f7" : value >= 20 ? "#f59e0b" : "#f43f5e"

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 100" className="w-52 max-w-full">
        <defs>
          <linearGradient id="gaugeBg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25}/>
            <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.25}/>
            <stop offset="100%" stopColor="#34d399" stopOpacity={0.25}/>
          </linearGradient>
          <linearGradient id="gaugeFg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e"/>
            <stop offset="50%" stopColor="#f59e0b"/>
            <stop offset="100%" stopColor="#34d399"/>
          </linearGradient>
        </defs>

        {/* Trilha de fundo */}
        <path
          d={`M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 0 1 ${bgEnd.x} ${bgEnd.y}`}
          fill="none" stroke="url(#gaugeBg)" strokeWidth="12" strokeLinecap="round"
        />

        {/* Arco preenchido */}
        {value > 0 && (
          <path
            d={`M ${bgStart.x} ${bgStart.y} A ${R} ${R} 0 ${value >= 50 ? 0 : 0} 1 ${fgEnd.x} ${fgEnd.y}`}
            fill="none" stroke="url(#gaugeFg)" strokeWidth="12" strokeLinecap="round"
          />
        )}

        {/* Ponteiro */}
        <circle cx={needle.x} cy={needle.y} r="5" fill={color} stroke="white" strokeWidth="2"/>

        {/* Ticks */}
        {[0, 25, 50, 75, 100].map((t) => {
          const a = startAngle - (t / 100) * Math.PI
          const inner = { x: CX + (R - 10) * Math.cos(a), y: CY - (R - 10) * Math.sin(a) }
          const outer = { x: CX + (R + 6)  * Math.cos(a), y: CY - (R + 6)  * Math.sin(a) }
          return <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="rgba(150,150,180,0.3)" strokeWidth="1.5"/>
        })}

        {/* Labels dos ticks */}
        <text x={CX - R - 8} y={CY + 8} fontSize="9" fill="rgba(150,150,180,0.6)" textAnchor="middle">0</text>
        <text x={CX + R + 8} y={CY + 8} fontSize="9" fill="rgba(150,150,180,0.6)" textAnchor="middle">100</text>
      </svg>

      {/* Valor central */}
      <div className="text-center -mt-2">
        <p className="text-4xl font-extrabold text-gray-900 dark:text-white leading-none">{score}<span className="text-lg font-medium text-gray-400">%</span></p>
        <p className="text-sm font-semibold mt-1" style={{ color }}>{label}</p>
      </div>
    </div>
  )
}

// ── MarginBar ─────────────────────────────────────────────────────────────────

function MarginBar({ label, value, total, color, colorText }: { label: string; value: number; total: number; color: string; colorText: string }) {
  const pct = total > 0 ? Math.max(0, (value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
        <div className="text-right">
          <span className={`font-bold ${colorText}`}>{formatCurrency(Math.max(0, value))}</span>
          <span className="text-xs text-gray-400 ml-2">{pct.toFixed(1)}%</span>
        </div>
      </div>
      <div className="w-full h-3 bg-gray-100 dark:bg-[rgba(255,255,255,0.07)] rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}/>
      </div>
    </div>
  )
}

// ── MiniStat ──────────────────────────────────────────────────────────────────

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

// ── TxRow ─────────────────────────────────────────────────────────────────────

function TxRow({ t, onEdit, onDelete }: { t: Transaction; onEdit?: () => void; onDelete?: () => void }) {
  const isRev  = t.type === "revenue"
  const date   = new Date(t.date)
  const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center py-3 border-b border-gray-50 dark:border-[rgba(255,255,255,0.04)] gap-3 px-1 group hover:bg-gray-50/60 dark:hover:bg-[rgba(170,85,249,0.04)] rounded-lg transition-colors">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
        isRev ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" : "bg-rose-50 dark:bg-rose-500/10 text-rose-400"
      }`}>
        {isRev ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{t.description}</p>
        <p className="text-xs text-gray-400 truncate">{t.category}</p>
      </div>

      <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:flex items-center gap-1">
        <Calendar size={9}/>{dateStr}
      </span>

      <span className={`text-sm font-semibold whitespace-nowrap ${isRev ? "text-emerald-500" : "text-rose-400"}`}>
        {isRev ? "+" : "−"}{formatCurrency(t.amount)}
      </span>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit   && <button onClick={onEdit}   className="p-1 text-gray-300 hover:text-purple-500"><Pencil  size={11}/></button>}
        {onDelete && <button onClick={onDelete} className="p-1 text-gray-300 hover:text-rose-500"> <Trash2   size={11}/></button>}
      </div>
    </div>
  )
}
