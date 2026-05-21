import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  label: z.string().min(1),
  type:  z.enum(["BOOK", "LINK"]),
  url:   z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const buttons = await prisma.publicButton.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(buttons)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const agg = await prisma.publicButton.aggregate({
      where: { userId: session.user.id },
      _max: { order: true },
    })

    const button = await prisma.publicButton.create({
      data: { userId: session.user.id, ...data, order: (agg._max.order ?? -1) + 1 },
    })
    return NextResponse.json(button, { status: 201 })
  } catch (err) {
    console.error("[link-page/buttons POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
