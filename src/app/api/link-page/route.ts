import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  publicBio:             z.string().optional().nullable(),
  publicTheme:           z.string().optional(),
  publicFont:            z.string().optional(),
  publicBgColor:         z.string().optional().nullable(),
  publicButtonColor:     z.string().optional().nullable(),
  publicButtonTextColor: z.string().optional().nullable(),
  publicPhotoUrl:        z.string().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      publicBio: true,
      publicTheme: true,
      publicFont: true,
      publicBgColor: true,
      publicButtonColor: true,
      publicButtonTextColor: true,
      publicPhotoUrl: true,
      publicButtons: { orderBy: { order: "asc" } },
    },
  })

  return NextResponse.json(user)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)
    await prisma.user.update({ where: { id: session.user.id }, data })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[link-page PUT]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
