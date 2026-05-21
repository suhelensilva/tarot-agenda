import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  description: z.string().min(1).optional(),
  category:    z.string().optional(),
  amount:      z.number().positive().optional(),
  date:        z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)

    await prisma.expense.updateMany({
      where: { id, userId: session.user.id },
      data: {
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category    !== undefined ? { category:    data.category    } : {}),
        ...(data.amount      !== undefined ? { amount:      data.amount      } : {}),
        ...(data.date        !== undefined ? { date:        new Date(data.date) } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[despesas/[id] PUT]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.expense.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
