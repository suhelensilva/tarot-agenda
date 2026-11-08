import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  pixelId: z.string().min(1).optional(),
  accessToken: z.string().min(1).optional(),
  testEventCode: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const owned = await prisma.metaPixel.findFirst({ where: { id, userId: session.user.id } })
  if (!owned) return NextResponse.json({ error: "Pixel não encontrado" }, { status: 404 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  const pixel = await prisma.metaPixel.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ id: pixel.id, name: pixel.name, pixelId: pixel.pixelId, testEventCode: pixel.testEventCode })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const owned = await prisma.metaPixel.findFirst({ where: { id, userId: session.user.id } })
  if (!owned) return NextResponse.json({ error: "Pixel não encontrado" }, { status: 404 })

  await prisma.metaPixel.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
