import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Period = "today" | "week" | "month" | "semester" | "year" | "custom"

// ── Fuso de Brasília (UTC-3, sem horário de verão) ─────────────────────────
// Todas as bordas de período são calculadas no relógio de Brasília e
// convertidas para o instante real (UTC), independente do fuso do servidor
// (Vercel roda em UTC; o PC local roda em UTC-3).
const BR_OFFSET = 3 * 3600_000
const DAY = 24 * 3600_000
const TZ = "America/Sao_Paulo"

/** Meia-noite (ou hora indicada) no relógio de Brasília → instante real. Aceita dia/mês fora do intervalo (rola). */
function br(y: number, m: number, d: number, h = 0) {
  return new Date(Date.UTC(y, m, d, h) + BR_OFFSET)
}

function getPeriodRange(period: Period, from?: string, to?: string) {
  const nowBR = new Date(Date.now() - BR_OFFSET) // relógio de Brasília lido com getUTC*
  const Y = nowBR.getUTCFullYear()
  const M = nowBR.getUTCMonth()
  const D = nowBR.getUTCDate()
  const end = (next: Date) => new Date(next.getTime() - 1)

  if (period === "custom" && from && to) {
    const [fy, fm, fd] = from.split("-").map(Number)
    const [ty, tm, td] = to.split("-").map(Number)
    return { start: br(fy, fm - 1, fd), end: end(br(ty, tm - 1, td + 1)), prevStart: null, prevEnd: null }
  }

  if (period === "today") {
    return {
      start: br(Y, M, D),     end: end(br(Y, M, D + 1)),
      prevStart: br(Y, M, D - 1), prevEnd: end(br(Y, M, D)),
    }
  }

  if (period === "week") {
    const back = (nowBR.getUTCDay() + 6) % 7 // segunda = início
    const s = D - back
    return {
      start: br(Y, M, s),     end: end(br(Y, M, s + 7)),
      prevStart: br(Y, M, s - 7), prevEnd: end(br(Y, M, s)),
    }
  }

  if (period === "month") {
    return {
      start: br(Y, M, 1),     end: end(br(Y, M + 1, 1)),
      prevStart: br(Y, M - 1, 1), prevEnd: end(br(Y, M, 1)),
    }
  }

  if (period === "semester") {
    return {
      start: br(Y, M - 5, 1),  end: end(br(Y, M + 1, 1)),
      prevStart: br(Y, M - 11, 1), prevEnd: end(br(Y, M - 5, 1)),
    }
  }

  // year
  return {
    start: br(Y, 0, 1),     end: end(br(Y + 1, 0, 1)),
    prevStart: br(Y - 1, 0, 1), prevEnd: end(br(Y, 0, 1)),
  }
}

/** Gera labels e intervalos para o gráfico de área (no relógio de Brasília) */
function getChartBuckets(period: Period, start: Date, end: Date) {
  const wall = (d: Date) => new Date(d.getTime() - BR_OFFSET) // ler com getUTC*
  const s = wall(start)
  const sy = s.getUTCFullYear(), sm = s.getUTCMonth(), sd = s.getUTCDate()
  const buckets: { label: string; start: Date; end: Date }[] = []

  if (period === "today") {
    // 6 blocos de 4 horas: 00h, 04h, 08h, 12h, 16h, 20h
    for (let i = 0; i < 6; i++) {
      buckets.push({
        label: `${String(i * 4).padStart(2, "0")}h`,
        start: br(sy, sm, sd, i * 4),
        end:   new Date(br(sy, sm, sd, i * 4 + 4).getTime() - 1),
      })
    }
    return buckets
  }

  if (period === "week" || (period === "custom" && end.getTime() - start.getTime() <= 7 * DAY)) {
    for (let i = 0; br(sy, sm, sd + i) <= end; i++) {
      const b = br(sy, sm, sd + i)
      buckets.push({
        label: new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: TZ }).format(b).replace(".", ""),
        start: b,
        end:   new Date(br(sy, sm, sd + i + 1).getTime() - 1),
      })
    }
    return buckets
  }

  if (period === "month" || (period === "custom" && end.getTime() - start.getTime() <= 62 * DAY)) {
    // semanas (segunda a domingo, padrão brasileiro), cortadas nas bordas do período
    let cur = start
    let i = 1
    while (cur <= end) {
      const w = wall(cur)
      const toMonday = 7 - ((w.getUTCDay() + 6) % 7)
      const next = br(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() + toMonday)
      const bEnd = new Date(Math.min(next.getTime() - 1, end.getTime()))
      buckets.push({ label: `Sem ${i++}`, start: cur, end: bEnd })
      cur = next
    }
    return buckets
  }

  // semestre / ano / período longo: um bloco por mês
  for (let k = 0; br(sy, sm + k, 1) <= end; k++) {
    const b = br(sy, sm + k, 1)
    buckets.push({
      label: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: TZ }).format(b).replace(".", ""),
      start: k === 0 ? start : b,
      end:   new Date(Math.min(br(sy, sm + k + 1, 1).getTime() - 1, end.getTime())),
    })
  }
  return buckets
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const period = (searchParams.get("period") ?? "month") as Period
  const from   = searchParams.get("from") ?? undefined
  const to     = searchParams.get("to")   ?? undefined

  const { start, end, prevStart, prevEnd } = getPeriodRange(period, from, to)

  // ── Dados do período atual ───────────────────────────────────────────────
  const [appointments, expenses, prevAppointments, prevExpenses, topClients, statusCounts] = await Promise.all([
    // Receitas: só agendamentos com pagamento efetuado
    prisma.appointment.findMany({
      where: { userId, startTime: { gte: start, lte: end }, paymentStatus: "Pago" },
      select: { startTime: true, amountPaid: true, title: true, service: { select: { name: true } }, client: { select: { name: true } } },
      orderBy: { startTime: "desc" },
    }),

    // Despesas no período
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    }),

    // Período anterior (para comparação, se disponível)
    prevStart && prevEnd ? prisma.appointment.aggregate({
      where: { userId, startTime: { gte: prevStart, lte: prevEnd }, paymentStatus: "Pago" },
      _sum: { amountPaid: true },
    }) : Promise.resolve(null),

    prevStart && prevEnd ? prisma.expense.aggregate({
      where: { userId, date: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }) : Promise.resolve(null),

    // Top clientes do período — inclui qualquer agendamento com valor pago
    prisma.client.findMany({
      where: { userId, appointments: { some: { startTime: { gte: start, lte: end }, amountPaid: { gt: 0 }, paymentStatus: "Pago" } } },
      include: {
        appointments: {
          where: { startTime: { gte: start, lte: end }, amountPaid: { gt: 0 }, paymentStatus: "Pago" },
          select: { amountPaid: true },
        },
      },
    }),

    // Status counts — filtrado pelo período selecionado
    prisma.appointment.groupBy({
      by: ["status"],
      where: { userId, startTime: { gte: start, lte: end } },
      _count: true,
    }),
  ])

  // ── Totais ───────────────────────────────────────────────────────────────
  const totalRevenue   = appointments.reduce((s, a) => s + (a.amountPaid ?? 0), 0)
  const totalExpenses  = expenses.reduce((s, e) => s + e.amount, 0)
  const profit         = totalRevenue - totalExpenses
  const profitMargin   = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

  const prevRevenue    = prevAppointments?._sum?.amountPaid ?? 0
  const prevExpensesTotal = prevExpenses?._sum?.amount ?? 0

  const revenueDelta   = prevRevenue  > 0 ? ((totalRevenue  - prevRevenue)  / prevRevenue)  * 100 : null
  const expensesDelta  = prevExpensesTotal > 0 ? ((totalExpenses - prevExpensesTotal) / prevExpensesTotal) * 100 : null

  // ── Gráfico de área ──────────────────────────────────────────────────────
  const buckets = getChartBuckets(period, start, end)
  const chartData = await Promise.all(
    buckets.map(async (b) => {
      const [rev, exp] = await Promise.all([
        prisma.appointment.aggregate({
          where: { userId, startTime: { gte: b.start, lte: b.end }, paymentStatus: "Pago" },
          _sum: { amountPaid: true },
        }),
        prisma.expense.aggregate({
          where: { userId, date: { gte: b.start, lte: b.end } },
          _sum: { amount: true },
        }),
      ])
      return {
        label:    b.label,
        revenue:  rev._sum.amountPaid ?? 0,
        expenses: exp._sum.amount ?? 0,
        profit:   (rev._sum.amountPaid ?? 0) - (exp._sum.amount ?? 0),
      }
    })
  )

  // ── Despesas por categoria (donut) ───────────────────────────────────────
  const expenseByCat: Record<string, number> = {}
  for (const e of expenses) {
    expenseByCat[e.category] = (expenseByCat[e.category] ?? 0) + e.amount
  }
  const expenseBreakdown = Object.entries(expenseByCat)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  // ── Transações mescladas (para histórico) ────────────────────────────────
  const transactions = [
    ...appointments.map((a) => ({
      id:          a.title + a.startTime,
      type:        "revenue" as const,
      description: a.client.name,
      category:    a.service?.name ?? "Sessão",
      amount:      a.amountPaid ?? 0,
      date:        a.startTime.toISOString(),
    })),
    ...expenses.map((e) => ({
      id:          e.id,
      type:        "expense" as const,
      description: e.description,
      category:    e.category,
      amount:      e.amount,
      date:        e.date.toISOString(),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ── Top clientes ─────────────────────────────────────────────────────────
  const clientStats = topClients
    .map((c) => ({
      id:           c.id,
      name:         c.name,
      sessions:     c.appointments.length,
      totalRevenue: c.appointments.reduce((s, a) => s + (a.amountPaid ?? 0), 0),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)

  return NextResponse.json({
    summary: { totalRevenue, totalExpenses, profit, profitMargin, revenueDelta, expensesDelta, totalSessions: appointments.length },
    chartData,
    expenseBreakdown,
    transactions: transactions.slice(0, 30),
    clientStats,
    statusCounts,
    period: { start: start.toISOString(), end: end.toISOString() },
  })
}
