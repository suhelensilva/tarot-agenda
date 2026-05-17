import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
    include: {
      appointments: {
        include: { service: true },
        orderBy: { startTime: "desc" },
      },
      anamnesisRecords: {
        orderBy: { date: "desc" },
      },
    },
  })

  if (!client) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  return NextResponse.json(client)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const client = await prisma.client.updateMany({
      where: { id, userId: session.user.id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        notes: data.notes || null,
      },
    })

    return NextResponse.json(client)
  } catch (err) {
    console.error("[clientes PUT]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  await prisma.client.deleteMany({ where: { id, userId: session.user.id } })

  return NextResponse.json({ ok: true })
}
