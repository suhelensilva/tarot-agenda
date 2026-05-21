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
  active: z.boolean().optional(),
  showOnPublicLink: z.boolean().optional(),
  categoryId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)

    await prisma.service.updateMany({
      where: { id, userId: session.user.id },
      data,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[servicos PUT]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const permanent = searchParams.get("permanent") === "true"

  if (permanent) {
    await prisma.service.deleteMany({ where: { id, userId: session.user.id } })
  } else {
    await prisma.service.updateMany({ where: { id, userId: session.user.id }, data: { active: false } })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  // Parse optional body; fall back to "reactivate" if none provided
  let updateData: Record<string, unknown> = { active: true }
  try {
    const body = await req.json()
    if (body && typeof body === "object" && Object.keys(body).length > 0) {
      updateData = {}
      if (typeof body.active === "boolean") updateData.active = body.active
      if (typeof body.showOnPublicLink === "boolean") updateData.showOnPublicLink = body.showOnPublicLink
      if (Object.keys(updateData).length === 0) updateData = { active: true }
    }
  } catch {
    // no body → reactivation
  }

  await prisma.service.updateMany({
    where: { id, userId: session.user.id },
    data: updateData,
  })

  return NextResponse.json({ ok: true })
}
