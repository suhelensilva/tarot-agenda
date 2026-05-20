import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
  cancellationReason: z.string().optional(),
  amountPaid: z.number().optional(),
})

const editSchema = z.object({
  clientId: z.string(),
  serviceId: z.string().optional().nullable(),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  amountPaid: z.number().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
      const fields = parsed.error.issues.map((e) => `${e.path.map(String).join(".")}: ${e.message}`).join(", ")
      console.error("[agendamentos PATCH] validação falhou:", fields)
      return NextResponse.json({ error: `Campos inválidos: ${fields}` }, { status: 400 })
    }

    await prisma.appointment.updateMany({
      where: { id, userId: session.user.id },
      data: parsed.data,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[agendamentos PATCH]", err)
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    console.log("[agendamentos PUT] body recebido:", JSON.stringify(body))

    const parsed = editSchema.safeParse(body)
    if (!parsed.success) {
      const fields = parsed.error.issues.map((e) => `${e.path.map(String).join(".")}: ${e.message}`).join(", ")
      console.error("[agendamentos PUT] validação falhou:", fields)
      return NextResponse.json({ error: `Campos inválidos: ${fields}` }, { status: 400 })
    }
    const data = parsed.data

    await prisma.appointment.updateMany({
      where: { id, userId: session.user.id },
      data: {
        clientId: data.clientId,
        serviceId: data.serviceId ?? null,
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes ?? null,
        meetingLink: data.meetingLink ?? null,
        amountPaid: data.amountPaid ?? null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[agendamentos PUT]", err)
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  await prisma.appointment.deleteMany({ where: { id, userId: session.user.id } })

  return NextResponse.json({ ok: true })
}
