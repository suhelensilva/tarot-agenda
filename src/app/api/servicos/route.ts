import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/plan"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  duration: z.number().min(1),
  type: z.enum(["ONE_TIME", "MONTHLY", "RECURRING"]),
  categoryId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const services = await prisma.service.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { appointments: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const limits = getPlanLimits(session.user.plan)
    if (limits.services !== -1) {
      const count = await prisma.service.count({ where: { userId: session.user.id } })
      if (count >= limits.services) {
        return NextResponse.json(
          { error: `Limite de ${limits.services} serviços atingido. Faça upgrade do plano para adicionar mais.`, code: "PLAN_LIMIT" },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const data = schema.parse(body)

    const service = await prisma.service.create({
      data: { userId: session.user.id, ...data },
      include: { category: { select: { id: true, name: true } } },
    })

    return NextResponse.json(service, { status: 201 })
  } catch (err) {
    console.error("[servicos POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
