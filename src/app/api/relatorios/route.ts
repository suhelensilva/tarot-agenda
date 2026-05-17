import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id
  const now = new Date()

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, i)
    return { start: startOfMonth(d), end: endOfMonth(d), label: d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) }
  }).reverse()

  const [monthlyRevenue, topClients, cancelReasons, statusCounts] = await Promise.all([
    Promise.all(
      months.map(async (m) => {
        const agg = await prisma.appointment.aggregate({
          where: { userId, startTime: { gte: m.start, lte: m.end }, status: "COMPLETED" },
          _sum: { amountPaid: true },
          _count: true,
        })
        return { label: m.label, revenue: agg._sum.amountPaid ?? 0, count: agg._count }
      })
    ),

    prisma.client.findMany({
      where: { userId },
      include: {
        appointments: {
          where: { status: "COMPLETED" },
          select: { amountPaid: true },
        },
        _count: { select: { appointments: true } },
      },
      orderBy: { appointments: { _count: "desc" } },
      take: 10,
    }),

    prisma.appointment.groupBy({
      by: ["cancellationReason"],
      where: { userId, status: "CANCELLED", cancellationReason: { not: null } },
      _count: true,
      orderBy: { _count: { cancellationReason: "desc" } },
    }),

    prisma.appointment.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }),
  ])

  const clientStats = topClients.map((c) => ({
    id: c.id,
    name: c.name,
    totalSessions: c._count.appointments,
    totalRevenue: c.appointments.reduce((sum, a) => sum + (a.amountPaid ?? 0), 0),
  }))

  return NextResponse.json({ monthlyRevenue, clientStats, cancelReasons, statusCounts })
}
