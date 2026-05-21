import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  label:  z.string().min(1).optional(),
  type:   z.enum(["BOOK", "LINK"]).optional(),
  url:    z.string().optional().nullable(),
  active: z.boolean().optional(),
  order:  z.number().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)
    await prisma.publicButton.updateMany({ where: { id, userId: session.user.id }, data })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[link-page/buttons/[id] PUT]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.publicButton.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}

/** PATCH — reordenar: body { direction: "up" | "down" } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const { direction } = await req.json() as { direction: "up" | "down" }

  const all = await prisma.publicButton.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
  })

  const idx = all.findIndex((b) => b.id === id)
  if (idx === -1) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const swapIdx = direction === "up" ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= all.length) return NextResponse.json({ ok: true })

  await Promise.all([
    prisma.publicButton.update({ where: { id: all[idx].id },    data: { order: all[swapIdx].order } }),
    prisma.publicButton.update({ where: { id: all[swapIdx].id }, data: { order: all[idx].order    } }),
  ])

  return NextResponse.json({ ok: true })
}
