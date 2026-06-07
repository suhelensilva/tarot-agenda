import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  title: z.string(),
  date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time:  z.string().optional(),
  type:  z.enum(["todo", "schedule", "postit"]).default("todo"),
  done:  z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const date = new URL(req.url).searchParams.get("date")
  if (!date) return NextResponse.json({ error: "date obrigatório" }, { status: 400 })

  const tasks = await prisma.plannerTask.findMany({
    where: { userId: session.user.id, date },
    orderBy: [{ type: "asc" }, { time: "asc" }, { createdAt: "asc" }],
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const data = schema.parse(await req.json())
    const task = await prisma.plannerTask.create({
      data: { userId: session.user.id, ...data },
    })
    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
