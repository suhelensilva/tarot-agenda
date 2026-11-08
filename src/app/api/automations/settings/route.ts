import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const settings = await prisma.automationSettings.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json(settings ?? {
    birthdayEnabled: false,
    birthdaySendHour: 13,
    birthdayMessage: "Oi {nome}, parabéns pelo seu novo ciclo! ✨🌙\n\nQue este ano seja repleto de luz e realizações.\n\nCom carinho 💜",
    testMode: true,
    testPhone: null,
  })
}

const schema = z.object({
  birthdayEnabled:  z.boolean().optional(),
  birthdaySendHour: z.number().int().min(0).max(23).optional(),
  birthdayMessage:  z.string().min(1).optional(),
  testMode:         z.boolean().optional(),
  testPhone:        z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = schema.parse(await req.json())

  const settings = await prisma.automationSettings.upsert({
    where:  { userId: session.user.id },
    create: { userId: session.user.id, ...body },
    update: body,
  })

  return NextResponse.json(settings)
}
