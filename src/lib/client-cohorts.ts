// Clientes novas x recorrentes.
// Regra: a cliente é "nova" no mês (relógio de Brasília) do primeiro atendimento
// pago com valor > 0. Em qualquer mês seguinte em que pagar algo, ela é "recorrente".
// Só conta paymentStatus = "Pago" e amountPaid > 0, igual ao financeiro.

const BR_OFFSET = 3 * 3600_000

export type PaidAppt = { clientId: string; startTime: Date; amountPaid: number | null }

export type CohortRow = {
  key: string // YYYY-MM
  newCount: number
  newRevenue: number
  recurringCount: number
  recurringRevenue: number
  recurringPct: number // % do faturamento vindo de recorrentes
}

export function monthKeyBR(d: Date) {
  const w = new Date(d.getTime() - BR_OFFSET)
  return `${w.getUTCFullYear()}-${String(w.getUTCMonth() + 1).padStart(2, "0")}`
}

/** Mês de entrada de cada cliente, a partir de TODOS os atendimentos pagos dela. */
export function firstMonthByClient(all: PaidAppt[]) {
  const first = new Map<string, string>()
  for (const a of all) {
    if (!(a.amountPaid && a.amountPaid > 0)) continue
    const k = monthKeyBR(a.startTime)
    const cur = first.get(a.clientId)
    if (!cur || k < cur) first.set(a.clientId, k)
  }
  return first
}

function finish(r: Omit<CohortRow, "recurringPct">): CohortRow {
  const total = r.newRevenue + r.recurringRevenue
  return { ...r, recurringPct: total > 0 ? (r.recurringRevenue / total) * 100 : 0 }
}

/**
 * Quebra por mês dos atendimentos de `inRange` (já filtrados pelo período),
 * usando `first` (mês de entrada calculado com o histórico completo).
 */
export function cohortByMonth(inRange: PaidAppt[], first: Map<string, string>) {
  const rows = new Map<string, { newC: Set<string>; recC: Set<string>; newR: number; recR: number }>()
  for (const a of inRange) {
    const v = a.amountPaid ?? 0
    if (v <= 0) continue
    const k = monthKeyBR(a.startTime)
    let row = rows.get(k)
    if (!row) rows.set(k, (row = { newC: new Set(), recC: new Set(), newR: 0, recR: 0 }))
    if (first.get(a.clientId) === k) { row.newC.add(a.clientId); row.newR += v }
    else { row.recC.add(a.clientId); row.recR += v }
  }
  return [...rows.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, r]) => finish({
      key,
      newCount: r.newC.size, newRevenue: r.newR,
      recurringCount: r.recC.size, recurringRevenue: r.recR,
    }))
}

/** Soma das linhas (clientes contadas uma vez por grupo). */
export function cohortTotal(inRange: PaidAppt[], first: Map<string, string>) {
  const newC = new Set<string>(), recC = new Set<string>()
  let newR = 0, recR = 0
  for (const a of inRange) {
    const v = a.amountPaid ?? 0
    if (v <= 0) continue
    if (first.get(a.clientId) === monthKeyBR(a.startTime)) { newC.add(a.clientId); newR += v }
    else { recC.add(a.clientId); recR += v }
  }
  return finish({ key: "total", newCount: newC.size, newRevenue: newR, recurringCount: recC.size, recurringRevenue: recR })
}
