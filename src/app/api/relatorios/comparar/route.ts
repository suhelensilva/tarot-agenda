import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Comparativo entre dois períodos personalizados (A e B), dia a dia.
// Mesmas regras do financeiro: receita = agendamento com paymentStatus "Pago",
// contado no dia em que foi marcado como pago (paidAt), no relógio de Brasília.

const BR_OFFSET = 3 * 3600_000
const MAX_DAYS = 366
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Meia-noite no relógio de Brasília → instante real. */
function br(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d) + BR_OFFSET)
}

/** YYYY-MM-DD do dia (relógio de Brasília) de um instante. */
function dayKeyBR(d: Date) {
  return new Date(d.getTime() - BR_OFFSET).toISOString().slice(0, 10)
}

function parseRange(from: string | null, to: string | null) {
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) return null
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  const start = br(fy, fm - 1, fd)
  const endExcl = br(ty, tm - 1, td + 1)
  const days = Math.round((endExcl.getTime() - start.getTime()) / 86400_000)
  if (days < 1 || days > MAX_DAYS) return null
  return { from, to, start, end: new Date(endExcl.getTime() - 1), days, y: fy, m: fm - 1, d: fd }
}

type Range = NonNullable<ReturnType<typeof parseRange>>

async function buildPeriod(userId: string, r: Range, firstPaid: Map<string, number>, paidCount: Map<string, number>) {
  const [appointments, expenses] = await Promise.all([
    prisma.appointment.findMany({
      where: { userId, paymentStatus: "Pago", paidAt: { gte: r.start, lte: r.end } },
      select: {
        clientId: true, paidAt: true, startTime: true, amountPaid: true,
        service: { select: { name: true } }, client: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: r.start, lte: r.end } },
      select: { amount: true, date: true, category: true },
    }),
  ])

  // ── Dia a dia ──────────────────────────────────────────────────────────────
  const days = Array.from({ length: r.days }, (_, i) => {
    const key = dayKeyBR(br(r.y, r.m, r.d + i))
    return { date: key, revenue: 0, expenses: 0, sessions: 0 }
  })
  const idx = new Map(days.map((d, i) => [d.date, i]))

  let revenue = 0
  const paidSessions = appointments.filter((a) => (a.amountPaid ?? 0) > 0).length
  const clients = new Set<string>()
  const newClients = new Set<string>()
  const byService = new Map<string, { revenue: number; sessions: number }>()
  const byClient = new Map<string, { name: string; revenue: number; sessions: number }>()

  for (const a of appointments) {
    const v = a.amountPaid ?? 0
    const when = a.paidAt ?? a.startTime
    const i = idx.get(dayKeyBR(when))
    if (i !== undefined) { days[i].revenue += v; days[i].sessions += 1 }
    revenue += v
    clients.add(a.clientId)
    const fp = firstPaid.get(a.clientId)
    if (v > 0 && fp !== undefined && fp >= r.start.getTime() && fp <= r.end.getTime()) newClients.add(a.clientId)

    const sName = a.service?.name ?? "Sem serviço"
    const s = byService.get(sName) ?? { revenue: 0, sessions: 0 }
    s.revenue += v; s.sessions += 1
    byService.set(sName, s)

    const c = byClient.get(a.clientId) ?? { name: a.client.name, revenue: 0, sessions: 0 }
    c.revenue += v; c.sessions += 1
    byClient.set(a.clientId, c)
  }

  let totalExpenses = 0
  const byCategory = new Map<string, number>()
  for (const e of expenses) {
    totalExpenses += e.amount
    const i = idx.get(dayKeyBR(e.date))
    if (i !== undefined) days[i].expenses += e.amount
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount)
  }

  // ── Origem das clientes (só pagamentos com valor) ──────────────────────────
  // nova única      = 1º pagamento da vida dela caiu neste período e nunca mais pagou
  // nova que voltou = 1º pagamento caiu neste período e pagou de novo depois (aqui ou mais tarde, até hoje)
  // recorrente      = já tinha pago antes do início do período
  const perClient = new Map<string, { n: number; revenue: number }>()
  for (const a of appointments) {
    const v = a.amountPaid ?? 0
    if (v <= 0) continue
    const c = perClient.get(a.clientId) ?? { n: 0, revenue: 0 }
    c.n += 1; c.revenue += v
    perClient.set(a.clientId, c)
  }
  const group = () => ({ clients: 0, revenue: 0, sessions: 0 })
  const clientMix = { newOnce: group(), newRepeat: group(), recurring: group() }
  for (const [clientId, c] of perClient) {
    const fp = firstPaid.get(clientId)
    const isNew = fp !== undefined && fp >= r.start.getTime()
    const g = !isNew ? clientMix.recurring : (paidCount.get(clientId) ?? 0) > 1 ? clientMix.newRepeat : clientMix.newOnce
    g.clients += 1; g.revenue += c.revenue; g.sessions += c.n
  }

  const profit = revenue - totalExpenses
  const best = days.reduce<(typeof days)[number] | null>((b, d) => (d.revenue > 0 && (!b || d.revenue > b.revenue) ? d : b), null)

  return {
    from: r.from,
    to: r.to,
    days,
    summary: {
      revenue,
      expenses: totalExpenses,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      sessions: appointments.length,
      avgTicket: paidSessions > 0 ? revenue / paidSessions : 0,
      clients: clients.size,
      newClients: newClients.size,
      avgPerDay: revenue / r.days,
      daysWithSales: days.filter((d) => d.revenue > 0).length,
      totalDays: r.days,
      bestDay: best ? { date: best.date, revenue: best.revenue } : null,
    },
    clientMix,
    byService: [...byService.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
    expenseByCategory: [...byCategory.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    topClients: [...byClient.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const userId = session.user.id

  const sp = new URL(req.url).searchParams
  const a = parseRange(sp.get("aFrom"), sp.get("aTo"))
  const b = parseRange(sp.get("bFrom"), sp.get("bTo"))
  if (!a || !b) {
    return NextResponse.json({ error: `Períodos inválidos. Use datas válidas (início antes do fim) e no máximo ${MAX_DAYS} dias por período.` }, { status: 400 })
  }

  // Primeiro pagamento de cada cliente (histórico completo) → define "cliente nova"
  const allPaid = await prisma.appointment.findMany({
    where: { userId, paymentStatus: "Pago", amountPaid: { gt: 0 } },
    select: { clientId: true, paidAt: true, startTime: true },
  })
  // e quantas vezes cada cliente já pagou na vida (até hoje) → "nova que voltou"
  const firstPaid = new Map<string, number>()
  const paidCount = new Map<string, number>()
  for (const p of allPaid) {
    const t = (p.paidAt ?? p.startTime).getTime()
    const cur = firstPaid.get(p.clientId)
    if (cur === undefined || t < cur) firstPaid.set(p.clientId, t)
    paidCount.set(p.clientId, (paidCount.get(p.clientId) ?? 0) + 1)
  }

  const [pa, pb] = await Promise.all([buildPeriod(userId, a, firstPaid, paidCount), buildPeriod(userId, b, firstPaid, paidCount)])
  return NextResponse.json({ a: pa, b: pb })
}
