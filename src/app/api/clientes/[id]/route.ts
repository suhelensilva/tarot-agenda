import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { applyClientTag } from "@/lib/client-tag"

const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
  person2Name: z.string().optional().or(z.literal("")),
  person2BirthDate: z.string().optional().or(z.literal("")),
  tag: z.string().optional().or(z.literal("")),
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

    // Só atualiza os campos que vieram explicitamente no body
    // (evita apagar dados como birthDate quando só a tag é alterada)
    const updateData: Record<string, unknown> = {}
    if ("name"           in body) updateData.name           = data.name
    if ("phone"          in body) updateData.phone          = data.phone || null
    if ("email"          in body) updateData.email          = data.email || null
    if ("birthDate"      in body) updateData.birthDate      = data.birthDate ? new Date(data.birthDate) : null
    if ("notes"          in body) updateData.notes          = data.notes || null
    if ("person2Name"    in body) updateData.person2Name    = data.person2Name || null
    if ("person2BirthDate" in body) updateData.person2BirthDate = data.person2BirthDate ? new Date(data.person2BirthDate) : null
    if ("tag"            in body) updateData.tag            = data.tag || null

    const client = await prisma.client.updateMany({
      where: { id, userId: session.user.id },
      data: updateData,
    })

    // Etiqueta = lista do Kanban (fonte única)
    if ("tag" in body) {
      await applyClientTag(session.user.id, id, data.tag)
    }

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
