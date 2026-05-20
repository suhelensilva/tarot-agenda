import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().optional().nullable(),
  title: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  amountPaid: z.number().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month")
  const year = searchParams.get("year")

  let dateFilter = {}
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59)
    dateFilter = { startTime: { gte: start, lte: end } }
  }

  const appointments = await prisma.appointment.findMany({
    where: { userId: session.user.id, ...dateFilter },
    include: { client: true, service: true },
    orderBy: { startTime: "asc" },
  })

  return NextResponse.json(appointments)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const appointment = await prisma.appointment.create({
      data: {
        userId: session.user.id,
        clientId: data.clientId,
        serviceId: data.serviceId || null,
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes || null,
        meetingLink: data.meetingLink || null,
        amountPaid: data.amountPaid ?? null,
      },
      include: { client: true, service: true },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (err) {
    console.error("[agendamentos POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
