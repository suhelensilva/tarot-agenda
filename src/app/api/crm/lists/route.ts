import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/crm-auth"
import { auth } from "@/lib/auth"

// GET /api/crm/lists -> todas as listas/etiquetas do usuário, com contagem de membros.
// Aceita autenticação via CRM token (extensão) OU sessão (dashboard).
export async function GET(req: NextRequest) {
  let userId: string | undefined

  // Tenta CRM token (extensão Chrome)
  const tokenUser = await getUserFromToken(req)
  if (tokenUser) {
    userId = tokenUser.id
  } else {
    // Fallback: sessão do dashboard
    const session = await auth()
    if (session) userId = session.user.id
  }

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const lists = await prisma.crmList.findMany({
    where: { userId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { members: true } } },
  })

  return NextResponse.json(
    lists
      .filter((l) => l.name !== "__blacklist__")
      .map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        order: l.order,
        count: l._count.members,
        metaPixelId: l.metaPixelId ?? null,
      }))
  )
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

// POST /api/crm/lists -> cria uma lista nova.
export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req)
  if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

  let data: z.infer<typeof createSchema>
  try {
    data = createSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const last = await prisma.crmList.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const list = await prisma.crmList.create({
    data: {
      userId: user.id,
      name: data.name.trim(),
      color: data.color ?? "#8b5cf6",
      order: (last?.order ?? -1) + 1,
    },
  })

  return NextResponse.json({ id: list.id, name: list.name, color: list.color, order: list.order, count: 0 }, { status: 201 })
}
