import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  type: z.enum(["REMINDER_48H", "REMINDER_24H", "REMINDER_1H", "PREPARATION", "CONFIRMATION"]),
  content: z.string().min(1),
  active: z.boolean().optional(),
})

const defaults: Record<string, string> = {
  REMINDER_48H: "Olá, {{nome}}! 🔮 Passando para lembrar que sua sessão de tarot está agendada para {{data}} às {{hora}}. Qualquer dúvida estou à disposição!",
  REMINDER_24H: "Oi, {{nome}}! Amanhã às {{hora}} é a sua sessão de tarot. Confirma sua presença? Responda com SIM ou NÃO. 🌙",
  REMINDER_1H: "{{nome}}, sua sessão começa em 1 hora! ✨ Às {{hora}}. Te vejo logo!",
  PREPARATION: "Olá, {{nome}}! 🔮 Para aproveitar ao máximo nossa sessão, recomendo: beber água, estar num lugar tranquilo e trazer suas perguntas no coração. Até logo!",
  CONFIRMATION: "{{nome}}, seu agendamento foi confirmado! 🌟 Data: {{data}} às {{hora}}. {{link}}",
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const saved = await prisma.messageTemplate.findMany({
    where: { userId: session.user.id },
  })

  const types = ["REMINDER_48H", "REMINDER_24H", "REMINDER_1H", "PREPARATION", "CONFIRMATION"]
  const result = types.map((type) => {
    const found = saved.find((t) => t.type === type)
    return {
      type,
      content: found?.content ?? defaults[type],
      active: found?.active ?? true,
      saved: !!found,
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const template = await prisma.messageTemplate.upsert({
      where: { userId_type: { userId: session.user.id, type: data.type } },
      update: { content: data.content, active: data.active ?? true },
      create: { userId: session.user.id, type: data.type, content: data.content, active: data.active ?? true },
    })

    return NextResponse.json(template)
  } catch (err) {
    console.error("[mensagens POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
