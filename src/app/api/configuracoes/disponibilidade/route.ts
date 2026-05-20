import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.array(z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  active: z.boolean(),
  lunchStart: z.string().optional().nullable(),
  lunchEnd: z.string().optional().nullable(),
}))

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const saved = await prisma.availability.findMany({
    where: { userId: session.user.id },
    orderBy: { dayOfWeek: "asc" },
  })

  const days = Array.from({ length: 7 }, (_, i) => {
    const found = saved.find((a) => a.dayOfWeek === i)
    return {
      dayOfWeek: i,
      startTime: found?.startTime ?? "09:00",
      endTime: found?.endTime ?? "18:00",
      active: found?.active ?? false,
      lunchStart: found?.lunchStart ?? null,
      lunchEnd: found?.lunchEnd ?? null,
    }
  })

  return NextResponse.json(days)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const days = schema.parse(body)

    await prisma.availability.deleteMany({ where: { userId: session.user.id } })
    await prisma.availability.createMany({
      data: days.map((d) => ({ userId: session.user.id, ...d })),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[disponibilidade POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
