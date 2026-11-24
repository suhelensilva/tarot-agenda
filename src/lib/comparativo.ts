// Tipos e cálculos do comparativo de períodos (usados na tela e no PDF).
// Todas as contas são feitas aqui, em código — nada de estimativa.

export type CompareDay = { date: string; revenue: number; expenses: number; sessions: number }

export type CompareSummary = {
  revenue: number
  expenses: number
  profit: number
  margin: number
  sessions: number
  avgTicket: number
  clients: number
  newClients: number
  avgPerDay: number
  daysWithSales: number
  totalDays: number
  bestDay: { date: string; revenue: number } | null
}

export type ClientGroup = { clients: number; revenue: number; sessions: number }
export type ClientMix = { newOnce: ClientGroup; newRepeat: ClientGroup; recurring: ClientGroup }
export type ClientGroupKey = keyof ClientMix

export const CLIENT_GROUPS: { key: ClientGroupKey; label: string; short: string; hint: string; color: string; light: string }[] = [
  { key: "newOnce", label: "Novas únicas", short: "Novas únicas", hint: "Primeira compra no período e nunca mais voltaram", color: "#f59e0b", light: "#fcd34d" },
  { key: "newRepeat", label: "Novas que voltaram", short: "Novas que voltaram", hint: "Primeira compra no período e já compraram de novo (até hoje)", color: "#10b981", light: "#6ee7b7" },
  { key: "recurring", label: "Recorrentes", short: "Recorrentes", hint: "Já eram clientes antes do período", color: "#8b5cf6", light: "#c4b5fd" },
]

export function mixTotals(m: ClientMix) {
  const clients = m.newOnce.clients + m.newRepeat.clients + m.recurring.clients
  const revenue = m.newOnce.revenue + m.newRepeat.revenue + m.recurring.revenue
  return { clients, revenue }
}

/** % da receita que veio de cada grupo. */
export function revenueShare(m: ClientMix, k: ClientGroupKey) {
  const { revenue } = mixTotals(m)
  return revenue > 0 ? (m[k].revenue / revenue) * 100 : 0
}

export function clientStory(data: CompareData, nameA: string, nameB: string): { headline: string; lines: string[] } {
  const A = data.a.clientMix, B = data.b.clientMix
  const ta = mixTotals(A), tb = mixTotals(B)
  const d = tb.clients - ta.clients
  const headline = d === 0
    ? `Você atendeu ${num(tb.clients)} cliente${tb.clients === 1 ? "" : "s"} nos dois períodos.`
    : `Você atendeu ${num(Math.abs(d))} cliente${Math.abs(d) === 1 ? "" : "s"} ${d > 0 ? "a mais" : "a menos"} em ${nameB} do que em ${nameA} (${num(tb.clients)} contra ${num(ta.clients)}).`
  const recA = revenueShare(A, "recurring"), recB = revenueShare(B, "recurring")
  const newB = B.newOnce.clients + B.newRepeat.clients, newA = A.newOnce.clients + A.newRepeat.clients
  const lines = [
    `${num(recB)}% da receita de ${nameB} veio de clientes recorrentes (em ${nameA}: ${num(recA)}%).`,
    `Clientes novas: ${num(newB)} em ${nameB} e ${num(newA)} em ${nameA}.`,
    newB > 0
      ? `Das novas de ${nameB}, ${num(B.newRepeat.clients)} já voltaram a comprar (${num((B.newRepeat.clients / newB) * 100)}%). Em ${nameA}: ${num(A.newRepeat.clients)} de ${num(newA)}.`
      : `Nenhuma cliente nova em ${nameB}.`,
  ]
  return { headline, lines }
}

export type ComparePeriod = {
  from: string
  to: string
  days: CompareDay[]
  summary: CompareSummary
  clientMix: ClientMix
  byService: { name: string; revenue: number; sessions: number }[]
  expenseByCategory: { category: string; amount: number }[]
  topClients: { name: string; revenue: number; sessions: number }[]
}

export type CompareData = { a: ComparePeriod; b: ComparePeriod }

export type Metric = "revenue" | "profit" | "expenses" | "sessions"
export type Grouping = "day" | "week" | "month"

export const METRIC_LABELS: Record<Metric, string> = {
  revenue: "Receita",
  profit: "Lucro",
  expenses: "Despesas",
  sessions: "Atendimentos",
}

export const GROUPING_LABELS: Record<Grouping, string> = { day: "Dia a dia", week: "Por semana", month: "Por mês" }
// ── Formatação ────────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

/** R$ sem o "Gratuito" do formatCurrency (aqui zero é zero). Espaço normal p/ caber no PDF. */
export function brl(v: number) {
  return BRL.format(v).replace(/ /g, " ")
}

export function num(v: number, digits = 0) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function formatMetric(metric: Metric, v: number) {
  return metric === "sessions" ? num(v) : brl(v)
}

/** Variação percentual de A para B. null quando A é zero (não dá pra calcular %). */
export function pctChange(a: number, b: number): number | null {
  if (a === 0) return b === 0 ? 0 : null
  return ((b - a) / Math.abs(a)) * 100
}

export function formatPct(p: number | null) {
  if (p === null) return "novo"
  return `${p > 0 ? "+" : ""}${num(p, 1)}%`
}

export function signed(v: number, fmt: (n: number) => string) {
  if (v === 0) return fmt(0)
  return `${v > 0 ? "+" : "-"}${fmt(Math.abs(v))}`
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}

/** "05/08" */
export function dm(iso: string) {
  const { m, d } = parts(iso)
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`
}

/** "05/08/2026" */
export function dmy(iso: string) {
  const { y } = parts(iso)
  return `${dm(iso)}/${y}`
}

/** "ter" */
export function weekday(iso: string) {
  return WEEKDAYS[parts(iso).wd]
}

/** "01/08 a 05/08/2026" (ou com os dois anos, se forem diferentes) */
export function rangeLabel(from: string, to: string) {
  if (from === to) return dmy(from)
  return parts(from).y === parts(to).y ? `${dm(from)} a ${dmy(to)}` : `${dmy(from)} a ${dmy(to)}`
}

// ── Agrupamento e alinhamento ─────────────────────────────────────────────────

export type Bucket = { label: string; dates: string; revenue: number; expenses: number; profit: number; sessions: number }

export function groupDays(days: CompareDay[], grouping: Grouping): Bucket[] {
  const make = (label: string, dates: string, list: CompareDay[]): Bucket => {
    const revenue = list.reduce((s, d) => s + d.revenue, 0)
    const expenses = list.reduce((s, d) => s + d.expenses, 0)
    return { label, dates, revenue, expenses, profit: revenue - expenses, sessions: list.reduce((s, d) => s + d.sessions, 0) }
  }

  if (grouping === "day") {
    return days.map((d, i) => make(`Dia ${i + 1}`, `${dm(d.date)} (${weekday(d.date)})`, [d]))
  }

  if (grouping === "week") {
    const out: Bucket[] = []
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7)
      const first = chunk[0].date, last = chunk[chunk.length - 1].date
      out.push(make(`Semana ${out.length + 1}`, first === last ? dm(first) : `${dm(first)} a ${dm(last)}`, chunk))
    }
    return out
  }

  const byMonth = new Map<string, CompareDay[]>()
  for (const d of days) {
    const k = d.date.slice(0, 7)
    byMonth.set(k, [...(byMonth.get(k) ?? []), d])
  }
  return [...byMonth.entries()].map(([k, list], i) => {
    const [y, m] = k.split("-").map(Number)
    return make(`Mês ${i + 1}`, `${MONTHS[m - 1]}/${String(y).slice(2)}`, list)
  })
}

export type AlignedRow = { label: string; a: Bucket | null; b: Bucket | null }

/** Dia 1 de A ao lado do dia 1 de B, dia 2 com dia 2… (períodos de tamanhos diferentes ficam com "—"). */
export function alignPeriods(a: CompareDay[], b: CompareDay[], grouping: Grouping): AlignedRow[] {
  const ga = groupDays(a, grouping)
  const gb = groupDays(b, grouping)
  const n = Math.max(ga.length, gb.length)
  return Array.from({ length: n }, (_, i) => ({ label: (ga[i] ?? gb[i]).label, a: ga[i] ?? null, b: gb[i] ?? null }))
}

export const WEEKDAY_ORDER = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

/** Soma da métrica por dia da semana (segunda a domingo). */
export function weekdayTotals(days: CompareDay[], metric: Metric): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0]
  for (const d of days) {
    const i = (parts(d.date).wd + 6) % 7
    out[i] += metric === "profit" ? d.revenue - d.expenses : d[metric]
  }
  return out
}

/** Agrupamento padrão conforme o tamanho do maior período. */
export function defaultGrouping(maxDays: number): Grouping {
  if (maxDays <= 45) return "day"
  if (maxDays <= 120) return "week"
  return "month"
}

// ── Uma métrica por vez ───────────────────────────────────────────────────────

/** Na despesa, diminuir é bom. */
export const LOWER_IS_BETTER: Record<Metric, boolean> = { revenue: false, profit: false, expenses: true, sessions: false }

export function metricTotal(metric: Metric, s: CompareSummary) {
  return metric === "revenue" ? s.revenue : metric === "expenses" ? s.expenses : metric === "profit" ? s.profit : s.sessions
}

/** "good" | "bad" | "neutral" — para colorir a variação. */
export function trend(diff: number, lowerIsBetter?: boolean): "good" | "bad" | "neutral" {
  if (Math.abs(diff) < 1e-9) return "neutral"
  const up = diff > 0
  return (lowerIsBetter ? !up : up) ? "good" : "bad"
}

export type BreakdownItem = { name: string; a: number; b: number }
export type Breakdown = { title: string; kind: "money" | "count"; items: BreakdownItem[] }

/** Até `max` itens; o resto vira "Outros". Ordena pelo total dos dois períodos. */
function topItems(items: BreakdownItem[], max = 6): BreakdownItem[] {
  const sorted = [...items].sort((x, y) => y.a + y.b - (x.a + x.b))
  if (sorted.length <= max) return sorted
  const rest = sorted.slice(max - 1)
  return [...sorted.slice(0, max - 1), { name: "Outros", a: rest.reduce((s, i) => s + i.a, 0), b: rest.reduce((s, i) => s + i.b, 0) }]
}

function union<T>(a: T[], b: T[], key: (t: T) => string, val: (t: T) => number): BreakdownItem[] {
  const map = new Map<string, BreakdownItem>()
  for (const x of a) map.set(key(x), { name: key(x), a: val(x), b: 0 })
  for (const x of b) { const it = map.get(key(x)) ?? { name: key(x), a: 0, b: 0 }; it.b = val(x); map.set(key(x), it) }
  return [...map.values()]
}

/** O segundo gráfico de cada métrica: de onde vem o número. */
export function breakdown(metric: Metric, data: CompareData): Breakdown {
  const A = data.a, B = data.b
  if (metric === "expenses") {
    return { title: "Onde foi o gasto", kind: "money", items: topItems(union(A.expenseByCategory, B.expenseByCategory, (e) => e.category, (e) => e.amount)) }
  }
  if (metric === "profit") {
    return {
      title: "Receita, despesas e lucro",
      kind: "money",
      items: [
        { name: "Receita", a: A.summary.revenue, b: B.summary.revenue },
        { name: "Despesas", a: A.summary.expenses, b: B.summary.expenses },
        { name: "Lucro", a: A.summary.profit, b: B.summary.profit },
      ],
    }
  }
  if (metric === "sessions") {
    return { title: "Atendimentos por serviço", kind: "count", items: topItems(union(A.byService, B.byService, (s) => s.name, (s) => s.sessions)) }
  }
  return { title: "Receita por serviço", kind: "money", items: topItems(union(A.byService, B.byService, (s) => s.name, (s) => s.revenue)) }
}

function bestDay(days: CompareDay[], metric: Metric) {
  let best: CompareDay | null = null
  for (const d of days) {
    const v = metric === "profit" ? d.revenue - d.expenses : d[metric]
    const bv = best ? (metric === "profit" ? best.revenue - best.expenses : best[metric]) : 0
    if (v > 0 && (!best || v > bv)) best = d
  }
  return best
}

/** Frase principal + no máximo 3 linhas curtas, só da métrica escolhida. */
export function metricStory(metric: Metric, data: CompareData, nameA: string, nameB: string): { headline: string; lines: string[] } {
  const A = data.a.summary, B = data.b.summary
  const a = metricTotal(metric, A), b = metricTotal(metric, B)
  const diff = b - a
  const p = pctChange(a, b)
  const pctTxt = p === null || diff === 0 ? "" : ` (${formatPct(p)})`
  const more = diff > 0 ? "a mais" : "a menos"
  const amount = formatMetric(metric, Math.abs(diff))

  const headline =
    diff === 0
      ? `${METRIC_LABELS[metric]} igual nos dois períodos.`
      : metric === "revenue" ? `Você faturou ${amount} ${more} em ${nameB} do que em ${nameA}${pctTxt}.`
      : metric === "expenses" ? `Você gastou ${amount} ${more} em ${nameB} do que em ${nameA}${pctTxt}.`
      : metric === "profit" ? `Sobrou ${amount} ${more} de lucro em ${nameB} do que em ${nameA}${pctTxt}.`
      : `Foram ${amount} atendimento${Math.abs(diff) === 1 ? "" : "s"} ${more} em ${nameB} do que em ${nameA}${pctTxt}.`

  const lines: string[] = []
  const bd = breakdown(metric, data).items.filter((i) => i.name !== "Outros")

  if (metric === "revenue") {
    const ba = bestDay(data.a.days, "revenue"), bb = bestDay(data.b.days, "revenue")
    if (ba || bb) lines.push(`Melhor dia: ${bb ? `${dm(bb.date)} (${brl(bb.revenue)})` : "nenhum"} em ${nameB}, ${ba ? `${dm(ba.date)} (${brl(ba.revenue)})` : "nenhum"} em ${nameA}.`)
    const top = [...bd].sort((x, y) => y.b - x.b)[0]
    if (top && top.b > 0) lines.push(`O serviço que mais vendeu em ${nameB} foi ${top.name} (${brl(top.b)}).`)
    lines.push(`Ticket médio: ${brl(A.avgTicket)} em ${nameA} e ${brl(B.avgTicket)} em ${nameB}.`)
  } else if (metric === "expenses") {
    const top = [...bd].sort((x, y) => y.b - x.b)[0]
    if (top && top.b > 0) lines.push(`O maior gasto em ${nameB} foi ${top.name} (${brl(top.b)}).`)
    const grew = [...bd].sort((x, y) => (y.b - y.a) - (x.b - x.a))[0]
    if (grew && grew.b - grew.a > 0) lines.push(`O que mais aumentou foi ${grew.name}: ${brl(grew.b - grew.a)} a mais.`)
    if (A.expenses === 0 && B.expenses === 0) lines.push("Nenhuma despesa registrada nos dois períodos.")
  } else if (metric === "profit") {
    lines.push(`A receita ${B.revenue >= A.revenue ? "subiu" : "caiu"} ${brl(Math.abs(B.revenue - A.revenue))} e as despesas ${B.expenses >= A.expenses ? "subiram" : "caíram"} ${brl(Math.abs(B.expenses - A.expenses))}.`)
    lines.push(`De cada R$ 100 que entraram, sobraram R$ ${num(Math.max(0, A.margin))} em ${nameA} e R$ ${num(Math.max(0, B.margin))} em ${nameB}.`)
  } else {
    lines.push(`Clientes novas: ${num(A.newClients)} em ${nameA} e ${num(B.newClients)} em ${nameB}.`)
    lines.push(`Ticket médio: ${brl(A.avgTicket)} em ${nameA} e ${brl(B.avgTicket)} em ${nameB}.`)
  }

  if (A.totalDays !== B.totalDays) lines.push(`Atenção: os períodos têm tamanhos diferentes (${A.totalDays} e ${B.totalDays} dias).`)
  return { headline, lines: lines.slice(0, 3) }
}

// ── Datas para os atalhos ─────────────────────────────────────────────────────

/** Hoje no relógio de Brasília, YYYY-MM-DD */
export function todayBR() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
}

export function isoFrom(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m, d))
  return dt.toISOString().slice(0, 10)
}

export function addDays(iso: string, n: number) {
  const { y, m, d } = parts(iso)
  return isoFrom(y, m - 1, d + n)
}

export function daysBetween(from: string, to: string) {
  const a = parts(from), b = parts(to)
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400_000) + 1
}

/** Mesmas datas um ano antes (29/02 vira 28/02). */
export function minusYear(iso: string) {
  const { y, m, d } = parts(iso)
  const last = new Date(Date.UTC(y - 1, m, 0)).getUTCDate()
  return isoFrom(y - 1, m - 1, Math.min(d, last))
}
