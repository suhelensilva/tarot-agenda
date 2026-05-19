import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })

  const category = await prisma.serviceCategory.updateMany({
    where: { id, userId: session.user.id },
    data: { name: name.trim() },
  })
  if (category.count === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  // Remove vínculo dos serviços antes de deletar
  await prisma.service.updateMany({
    where: { categoryId: id, userId: session.user.id },
    data: { categoryId: null },
  })

  await prisma.serviceCategory.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
