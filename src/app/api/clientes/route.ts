import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/plan"
import { z } from "zod"
import { applyClientTag, TAG_MEMBERSHIP_INCLUDE, withTag } from "@/lib/client-tag"

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
  person2Name: z.string().optional().or(z.literal("")),
  person2BirthDate: z.string().optional().or(z.literal("")),
  tag: z.string().optional().or(z.literal("")),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""

  const clients = await prisma.client.findMany({
    where: {
      userId: session.user.id,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }),
    },
    include: {
      _count: { select: { appointments: true } },
      ...TAG_MEMBERSHIP_INCLUDE,
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(clients.map(withTag))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const limits = getPlanLimits(session.user.plan)
    if (limits.clients !== -1) {
      const count = await prisma.client.count({ where: { userId: session.user.id } })
      if (count >= limits.clients) {
        return NextResponse.json(
          { error: `Limite de ${limits.clients} clientes atingido. Faça upgrade do plano para adicionar mais.`, code: "PLAN_LIMIT" },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const data = schema.parse(body)

    const client = await prisma.client.create({
      data: {
        userId: session.user.id,
        name: data.name,
        phone: data.phone || "",
        email: data.email || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        notes: data.notes || null,
        person2Name: data.person2Name || null,
        person2BirthDate: data.person2BirthDate ? new Date(data.person2BirthDate) : null,
      },
    })
    // Etiqueta = lista do Kanban (vínculo no banco, única fonte)
    const tag = await applyClientTag(session.user.id, client.id, data.tag)

    return NextResponse.json({ ...client, tag }, { status: 201 })
  } catch (err) {
    console.error("[clientes POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
