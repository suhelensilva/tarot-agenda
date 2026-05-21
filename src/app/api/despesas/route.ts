import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  description: z.string().min(1),
  category:    z.string().default("Outros"),
  amount:      z.number().positive(),
  date:        z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to   = searchParams.get("to")

  const expenses = await prisma.expense.findMany({
    where: {
      userId: session.user.id,
      ...(from && to ? { date: { gte: new Date(from), lte: new Date(to + "T23:59:59") } } : {}),
    },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const expense = await prisma.expense.create({
      data: {
        userId:      session.user.id,
        description: data.description,
        category:    data.category,
        amount:      data.amount,
        date:        data.date ? new Date(data.date) : new Date(),
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (err) {
    console.error("[despesas POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
