import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name:  z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#8b5cf6"),
  order: z.number().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const labels = await prisma.crmList.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { members: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json(labels)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const last = await prisma.crmList.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    const label = await prisma.crmList.create({
      data: {
        userId: session.user.id,
        name:   data.name,
        color:  data.color,
        order:  data.order ?? (last ? last.order + 1 : 0),
      },
    })

    return NextResponse.json(label, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
