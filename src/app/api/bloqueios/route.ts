import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Intervalos (horário no mesmo dia) e dias trancados da agenda.

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  // traz os que encostam no período pedido
  const where = from && to
    ? { userId: session.user.id, startTime: { lt: new Date(to) }, endTime: { gt: new Date(from) } }
    : { userId: session.user.id }

  const blocks = await prisma.agendaBlock.findMany({ where, orderBy: { startTime: "asc" } })
  return NextResponse.json(blocks)
}

const schema = z.object({
  kind: z.enum(["INTERVALO", "TRANCADO"]),
  note: z.string().optional().nullable(),
  // um item por bloqueio (trancar vários dias = vários itens)
  periods: z.array(z.object({ startTime: z.string(), endTime: z.string() })).min(1).max(62),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  const { kind, note, periods } = parsed.data

  const rows = periods.map((p) => ({
    userId: session.user.id,
    kind,
    note: note?.trim() || null,
    startTime: new Date(p.startTime),
    endTime: new Date(p.endTime),
  }))
  if (rows.some((r) => isNaN(r.startTime.getTime()) || isNaN(r.endTime.getTime()) || r.endTime <= r.startTime)) {
    return NextResponse.json({ error: "O horário final precisa ser depois do inicial." }, { status: 400 })
  }

  await prisma.agendaBlock.createMany({ data: rows })
  return NextResponse.json({ ok: true }, { status: 201 })
}
