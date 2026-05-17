import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
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
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const client = await prisma.client.create({
      data: {
        userId: session.user.id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        notes: data.notes || null,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (err) {
    console.error("[clientes POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
