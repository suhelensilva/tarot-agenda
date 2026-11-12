import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id
  // "now" lido com getFullYear/getMonth: usamos o relógio de Brasília via getUTC* abaixo
  const nowBR = new Date(Date.now() - 3 * 3600_000)
  const now = new Date(nowBR.getUTCFullYear(), nowBR.getUTCMonth(), nowBR.getUTCDate())
  const sixMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5, 1, 3))

  // Faturamento e quantidade de atendimentos por mes (ultimos 6 meses)
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      OR: [{ status: "COMPLETED" }, { paymentStatus: "Pago" }],
      startTime: { gte: sixMonthsAgo },
    },
    select: { startTime: true, amountPaid: true, status: true, paymentStatus: true },
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
    // mês no horário de Brasília (UTC-3), independente do fuso do servidor
    const d = new Date(new Date(appt.startTime).getTime() - 3 * 3600_000)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    if (monthMap[key]) {
      if (appt.paymentStatus === "Pago") monthMap[key].revenue += appt.amountPaid ?? 0
      if (appt.status === "COMPLETED") monthMap[key].count += 1
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
    const d = new Date(new Date(c.createdAt).getTime() - 3 * 3600_000)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
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
