import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  content: z.string(),
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const date = new URL(req.url).searchParams.get("date")
  if (!date) return NextResponse.json({ error: "date obrigatório" }, { status: 400 })

  const note = await prisma.plannerNote.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  })
  return NextResponse.json(note ?? { content: "" })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const { content, date } = schema.parse(await req.json())
    const note = await prisma.plannerNote.upsert({
      where:  { userId_date: { userId: session.user.id, date } },
      create: { userId: session.user.id, content, date },
      update: { content },
    })
    return NextResponse.json(note)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
