import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendText } from "@/lib/evolution"

// Vercel Cron ou chamada manual com secret
const CRON_SECRET = process.env.CRON_SECRET ?? ""

export async function POST(req: NextRequest) {
  // Autenticação: header Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization") ?? ""
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // Hora atual em BRT (UTC-3)
  const nowUTC = new Date()
  const nowBRT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000)
  const currentHour = nowBRT.getHours()
  const currentMonth = nowBRT.getMonth() + 1  // 1-12
  const currentDay = nowBRT.getDate()
  const currentYear = nowBRT.getFullYear()

  // Busca usuárias com aniversário ativo no horário certo
  const settings = await prisma.automationSettings.findMany({
    where: {
      birthdayEnabled: true,
      birthdaySendHour: currentHour,
      user: { whatsappConfig: { connected: true } },
    },
    include: {
      user: {
        include: { whatsappConfig: true },
      },
    },
  })

  const results: { userId: string; sent: number; skipped: number; errors: string[] }[] = []

  for (const setting of settings) {
    const user = setting.user
    const instanceId = user.whatsappConfig!.instanceId
    const sent: string[] = []
    const errors: string[] = []
    let skipped = 0

    // Clientes com aniversário hoje
    const clients = await prisma.client.findMany({
      where: {
        userId: user.id,
        birthDate: { not: null },
      },
      select: { id: true, name: true, phone: true, birthDate: true },
    })

    const birthdayClients = clients.filter((c) => {
      if (!c.birthDate) return false
      const bd = new Date(c.birthDate)
      return bd.getMonth() + 1 === currentMonth && bd.getDate() === currentDay
    })

    for (const client of birthdayClients) {
      // Verifica se já enviou este ano
      const alreadySent = await prisma.birthdayLog.findUnique({
        where: { userId_clientId_year: { userId: user.id, clientId: client.id, year: currentYear } },
      })
      if (alreadySent) { skipped++; continue }

      // Monta a mensagem
      const firstName = client.name.split(" ")[0]
      const message = setting.birthdayMessage
        .replace(/\{nome\}/gi, client.name)
        .replace(/\{primeiro_nome\}/gi, firstName)

      // Em modo teste, envia para o testPhone; caso contrário para o cliente
      const targetPhone = setting.testMode && setting.testPhone
        ? setting.testPhone
        : client.phone

      if (!targetPhone) { skipped++; continue }

      try {
        await sendText(instanceId, targetPhone, message)

        // Registra envio (mesmo em testMode, para não reenviar)
        await prisma.birthdayLog.create({
          data: { userId: user.id, clientId: client.id, year: currentYear },
        })

        sent.push(client.name)
      } catch (e) {
        errors.push(`${client.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    results.push({ userId: user.id, sent: sent.length, skipped, errors })
  }

  return NextResponse.json({ ok: true, hour: currentHour, processed: results })
}

// Vercel Cron também pode chamar via GET
export async function GET(req: NextRequest) {
  return POST(req)
}
