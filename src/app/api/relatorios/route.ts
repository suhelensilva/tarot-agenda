import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subMonths, subWeeks, subYears,
  eachWeekOfInterval, eachMonthOfInterval, eachDayOfInterval,
  format, parseISO,
} from "date-fns"
import { ptBR } from "date-fns/locale"

type Period = "week" | "month" | "semester" | "year" | "custom"

function getPeriodRange(period: Period, from?: string, to?: string) {
  const now = new Date()

  if (period === "custom" && from && to) {
    return {
      start: parseISO(from),
      end:   new Date(to + "T23:59:59"),
      prevStart: null,
      prevEnd:   null,
    }
  }

  if (period === "week") {
    const start = startOfWeek(now, { weekStartsOn: 0 })
    const end   = endOfWeek(now,   { weekStartsOn: 0 })
    const ps    = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 })
    const pe    = endOfWeek(subWeeks(now, 1),   { weekStartsOn: 0 })
    return { start, end, prevStart: ps, prevEnd: pe }
  }

  if (period === "month") {
    const start = startOfMonth(now)
    const end   = endOfMonth(now)
    const prev  = subMonths(now, 1)
    return { start, end, prevStart: startOfMonth(prev), prevEnd: endOfMonth(prev) }
  }

  if (period === "semester") {
    // últimos 6 meses completos
    const start = startOfMonth(subMonths(now, 5))
    const end   = endOfMonth(now)
    const ps    = startOfMonth(subMonths(now, 11))
    const pe    = endOfMonth(subMonths(now, 6))
    return { start, end, prevStart: ps, prevEnd: pe }
  }

  // year
  const start = startOfYear(now)
  const end   = endOfYear(now)
  const prev  = subYears(now, 1)
  return { start, end, prevStart: startOfYear(prev), prevEnd: endOfYear(prev) }
}

/** Gera labels e intervalos para o gráfico de área */
function getChartBuckets(period: Period, start: Date, end: Date) {
  if (period === "week") {
    const days = eachDayOfInterval({ start, end })
    return days.map((d) => ({
      label: format(d, "EEE", { locale: ptBR }),
      start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0),
      end:   new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59),
    }))
  }

  if (period === "month") {
    // semanas do mês
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 })
    return weeks.map((w, i) => ({
      label: `Sem ${i + 1}`,
      start: i === 0 ? start : w,
      end:   i === weeks.length - 1 ? end : endOfWeek(w, { weekStartsOn: 0 }),
    }))
  }

  if (period === "semester") {
    const months = eachMonthOfInterval({ start, end })
    return months.map((m) => ({
      label: format(m, "MMM", { locale: ptBR }),
      start: startOfMonth(m),
      end:   endOfMonth(m),
    }))
  }

  // year
  const months = eachMonthOfInterval({ start, end })
  return months.map((m) => ({
    label: format(m, "MMM", { locale: ptBR }),
    start: startOfMonth(m),
    end:   endOfMonth(m),
  }))
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
    // Receitas: agendamentos concluídos no período
    prisma.appointment.findMany({
      where: { userId, startTime: { gte: start, lte: end }, status: "COMPLETED" },
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
      where: { userId, startTime: { gte: prevStart, lte: prevEnd }, status: "COMPLETED" },
      _sum: { amountPaid: true },
    }) : Promise.resolve(null),

    prevStart && prevEnd ? prisma.expense.aggregate({
      where: { userId, date: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }) : Promise.resolve(null),

    // Top clientes do período
    prisma.client.findMany({
      where: { userId, appointments: { some: { startTime: { gte: start, lte: end }, status: "COMPLETED" } } },
      include: {
        appointments: {
          where: { startTime: { gte: start, lte: end }, status: "COMPLETED" },
          select: { amountPaid: true },
        },
      },
      take: 5,
    }),

    // Status counts (geral, todos os tempos)
    prisma.appointment.groupBy({
      by: ["status"],
      where: { userId },
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
          where: { userId, startTime: { gte: b.start, lte: b.end }, status: "COMPLETED" },
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

  return NextResponse.json({
    summary: { totalRevenue, totalExpenses, profit, profitMargin, revenueDelta, expensesDelta },
    chartData,
    expenseBreakdown,
    transactions: transactions.slice(0, 30),
    clientStats,
    statusCounts,
    period: { start: start.toISOString(), end: end.toISOString() },
  })
}
