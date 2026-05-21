import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isConfigured, sendText } from "@/lib/evolution"
import { z } from "zod"

const schema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  if (!isConfigured()) {
    return NextResponse.json({ error: "Evolution API não configurada" }, { status: 503 })
  }

  const config = await prisma.whatsappConfig.findUnique({
    where: { userId: session.user.id },
  })

  if (!config?.connected) {
    return NextResponse.json({ error: "WhatsApp não conectado" }, { status: 400 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const result = await sendText(config.instanceId, parsed.data.phone, parsed.data.message)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error("[whatsapp/enviar POST]", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao enviar" }, { status: 500 })
  }
}
