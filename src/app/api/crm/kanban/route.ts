import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const userId = session.user.id

  // Busca todas as listas do usuario com membros e stats de cada cliente
  const lists = await prisma.crmList.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      members: {
        include: {
          client: {
            include: {
              _count: { select: { appointments: true } },
              appointments: {
                where: { status: "COMPLETED" },
                orderBy: { startTime: "desc" },
                select: { startTime: true, amountPaid: true },
              },
            },
          },
        },
      },
    },
  })

  // Clientes sem nenhuma etiqueta
  const allMemberClientIds = await prisma.crmListMember.findMany({
    where: { list: { userId } },
    select: { clientId: true },
  })
  const taggedIds = new Set(allMemberClientIds.map((m) => m.clientId))

  const untaggedClients = await prisma.client.findMany({
    where: {
      userId,
      id: { notIn: Array.from(taggedIds) },
    },
    include: {
      _count: { select: { appointments: true } },
      appointments: {
        where: { status: "COMPLETED" },
        orderBy: { startTime: "desc" },
        select: { startTime: true, amountPaid: true },
      },
    },
    orderBy: { name: "asc" },
  })

  function summarize(client: {
    id: string
    name: string
    phone: string
    appointments: { startTime: Date; amountPaid: number | null }[]
    _count: { appointments: number }
  }) {
    const totalSpent = client.appointments.reduce((s, a) => s + (a.amountPaid ?? 0), 0)
    const lastAppt = client.appointments[0]?.startTime ?? null
    return {
      id:          client.id,
      name:        client.name,
      phone:       client.phone,
      sessionCount: client._count.appointments,
      completedCount: client.appointments.length,
      lastAppointmentDate: lastAppt,
      totalSpent,
    }
  }

  const result = lists.map((list) => {
    const clients = list.members.map((m) => summarize(m.client))
    const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0)
    return {
      id:    list.id,
      name:  list.name,
      color: list.color,
      order: list.order,
      clients,
      totalRevenue,
    }
  })

  const untagged = untaggedClients.map(summarize)
  const untaggedRevenue = untagged.reduce((s, c) => s + c.totalSpent, 0)

  return NextResponse.json({ lists: result, untagged, untaggedRevenue })
}
