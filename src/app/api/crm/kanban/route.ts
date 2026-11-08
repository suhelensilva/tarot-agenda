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
                orderBy: { startTime: "asc" },
                select: { startTime: true, amountPaid: true, status: true, title: true, service: { select: { name: true } } },
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
        orderBy: { startTime: "asc" },
        select: { startTime: true, amountPaid: true, status: true, title: true, service: { select: { name: true } } },
      },
    },
    orderBy: { name: "asc" },
  })

  function summarize(client: {
    id: string
    name: string
    phone: string
    appointments: { startTime: Date; amountPaid: number | null; status: string; title: string; service: { name: string } | null }[]
    _count: { appointments: number }
  }) {
    const completed = client.appointments.filter((a) => a.status === "COMPLETED")
    const totalSpent = completed.reduce((s, a) => s + (a.amountPaid ?? 0), 0)
    const lastAppt = completed.length > 0 ? completed[completed.length - 1].startTime : null
    const first = client.appointments[0]
    const firstServiceName = first?.service?.name ?? first?.title ?? null
    return {
      id:          client.id,
      name:        client.name,
      phone:       client.phone,
      sessionCount: client._count.appointments,
      completedCount: completed.length,
      lastAppointmentDate: lastAppt,
      totalSpent,
      firstServiceName,
    }
  }

  // Separa blacklist das listas normais
  const blacklistRecord = lists.find((l) => l.name === "__blacklist__")
  const normalLists = lists.filter((l) => l.name !== "__blacklist__")
  const blacklistClientIds = new Set(blacklistRecord?.members.map((m) => m.clientId) ?? [])

  const result = normalLists.map((list) => {
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

  // Clientes sem etiqueta excluindo os da blacklist
  const untagged = untaggedClients
    .filter((c) => !blacklistClientIds.has(c.id))
    .map(summarize)
  const untaggedRevenue = untagged.reduce((s, c) => s + c.totalSpent, 0)

  // Garante que a lista blacklist existe no banco
  let blacklistId = blacklistRecord?.id ?? null
  if (!blacklistId) {
    const created = await prisma.crmList.create({
      data: { userId, name: "__blacklist__", color: "#ef4444", order: 9999 },
    })
    blacklistId = created.id
  }

  const blacklistClients = (blacklistRecord?.members ?? []).map((m) => summarize(m.client))

  return NextResponse.json({ lists: result, untagged, untaggedRevenue, blacklist: { id: blacklistId, clients: blacklistClients } })
}
