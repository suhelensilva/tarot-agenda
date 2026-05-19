import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const categories = await prisma.serviceCategory.findMany({
    where: { userId: session.user.id },
    include: { services: { where: { active: true }, select: { id: true } } },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })

  const category = await prisma.serviceCategory.create({
    data: { userId: session.user.id, name: name.trim() },
  })
  return NextResponse.json(category, { status: 201 })
}
