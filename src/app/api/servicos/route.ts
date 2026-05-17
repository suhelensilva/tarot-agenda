import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  duration: z.number().min(1),
  type: z.enum(["ONE_TIME", "MONTHLY", "RECURRING"]),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const services = await prisma.service.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { appointments: true } } },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const service = await prisma.service.create({
      data: { userId: session.user.id, ...data },
    })

    return NextResponse.json(service, { status: 201 })
  } catch (err) {
    console.error("[servicos POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
