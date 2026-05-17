import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
  cancellationReason: z.string().optional(),
  amountPaid: z.number().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = statusSchema.parse(body)

    await prisma.appointment.updateMany({
      where: { id, userId: session.user.id },
      data,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[agendamentos PATCH]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  await prisma.appointment.deleteMany({ where: { id, userId: session.user.id } })

  return NextResponse.json({ ok: true })
}
