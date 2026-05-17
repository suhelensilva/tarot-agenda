import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  mainSubject: z.string().optional(),
  productName: z.string().optional(),
  logoUrl: z.string().optional(),
  backgroundUrl: z.string().optional(),
  involvedPeople: z.array(z.object({
    name: z.string(),
    birthDate: z.string().optional(),
    relation: z.string().optional(),
  })).optional(),
  mainComplaint: z.string().optional(),
  complaintText: z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)

    await prisma.ficha.updateMany({
      where: { id, userId: session.user.id },
      data: { ...data, involvedPeople: data.involvedPeople ?? [] },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[fichas PUT]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.ficha.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
