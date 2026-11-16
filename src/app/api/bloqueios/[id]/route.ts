import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const editSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  note: z.string().optional().nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const parsed = editSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const startTime = new Date(parsed.data.startTime)
  const endTime = new Date(parsed.data.endTime)
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || endTime <= startTime) {
    return NextResponse.json({ error: "O horário final precisa ser depois do inicial." }, { status: 400 })
  }

  await prisma.agendaBlock.updateMany({
    where: { id, userId: session.user.id },
    data: { startTime, endTime, note: parsed.data.note?.trim() || null },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.agendaBlock.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
