import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1).max(60),
  pixelId: z.string().min(1),
  accessToken: z.string().min(1),
  testEventCode: z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const pixels = await prisma.metaPixel.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, pixelId: true, testEventCode: true, createdAt: true },
  })

  return NextResponse.json(pixels)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  try {
    const pixel = await prisma.metaPixel.create({
      data: { ...parsed.data, userId: session.user.id },
      select: { id: true, name: true, pixelId: true, testEventCode: true },
    })
    return NextResponse.json(pixel, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[meta-pixels POST]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
