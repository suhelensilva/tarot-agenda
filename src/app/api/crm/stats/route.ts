import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  // Faturamento e quantidade de atendimentos por mes (ultimos 6 meses)
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: "COMPLETED",
      startTime: { gte: sixMonthsAgo },
    },
    select: { startTime: true, amountPaid: true },
  })

  const monthMap: Record<string, { revenue: number; count: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    monthMap[key] = { revenue: 0, count: 0 }
    monthMap[key + "__label"] = label as unknown as { revenue: number; count: number }
  }

  for (const appt of appointments) {
    const d = new Date(appt.startTime)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (monthMap[key]) {
      monthMap[key].revenue += appt.amountPaid ?? 0
      monthMap[key].count += 1
    }
  }

  const monthlyRevenue = Object.entries(monthMap)
    .filter(([k]) => !k.includes("__label"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      const [year, month] = key.split("-")
      const d = new Date(Number(year), Number(month) - 1, 1)
      return {
        month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        revenue: (val as { revenue: number; count: number }).revenue,
        count: (val as { revenue: number; count: number }).count,
      }
    })

  // Novos clientes por mes
  const newClients = await prisma.client.findMany({
    where: { userId, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true },
  })

  const clientMonthMap: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    clientMonthMap[key] = 0
  }
  for (const c of newClients) {
    const d = new Date(c.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (key in clientMonthMap) clientMonthMap[key]++
  }

  const monthlyClients = Object.entries(clientMonthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [year, month] = key.split("-")
      const d = new Date(Number(year), Number(month) - 1, 1)
      return { month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), count }
    })

  return NextResponse.json({ monthlyRevenue, monthlyClients })
}
