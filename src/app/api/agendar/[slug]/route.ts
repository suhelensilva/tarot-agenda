import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { addMinutes } from "date-fns"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const user = await prisma.user.findUnique({
    where: { id: slug },
    select: {
      id: true,
      name: true,
      publicBio: true,
      publicTheme: true,
      publicFont: true,
      publicBgColor: true,
      publicButtonColor: true,
      publicButtonTextColor: true,
      publicPhotoUrl: true,
      availability: true,
      publicButtons: {
        where: { active: true },
        orderBy: { order: "asc" },
      },
      services: {
        where: { active: true, showOnPublicLink: true },
        select: { id: true, name: true, price: true, duration: true },
      },
    },
  })

  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  return NextResponse.json(user)
}

const bookSchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string(),
  startTime: z.string(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const user = await prisma.user.findUnique({ where: { id: slug } })
  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  try {
    const body = await req.json()
    const data = bookSchema.parse(body)

    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, userId: slug, active: true },
    })
    if (!service) return NextResponse.json({ error: "Serviço inválido" }, { status: 400 })

    let client = await prisma.client.findFirst({
      where: { userId: slug, phone: data.clientPhone },
    })

    if (!client) {
      client = await prisma.client.create({
        data: { userId: slug, name: data.clientName, phone: data.clientPhone },
      })
    }

    const start = new Date(`${data.date}T${data.startTime}:00`)
    const end = addMinutes(start, service.duration)

    const appointment = await prisma.appointment.create({
      data: {
        userId: slug,
        clientId: client.id,
        serviceId: service.id,
        title: `${service.name} — ${data.clientName}`,
        startTime: start,
        endTime: end,
        amountPaid: service.price,
      },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (err) {
    console.error("[agendar POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
