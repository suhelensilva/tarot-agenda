import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { fbcIsFresh } from "@/lib/meta-capi" // fireCAPIEvent comentado — META CAPI DESATIVADO
import { TAG_MEMBERSHIP_INCLUDE, withTag } from "@/lib/client-tag"

const schema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().optional().nullable(),
  title: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional().nullable(),
  motivo: z.string().optional().nullable(),
  perguntas: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  amountPaid: z.number().optional().nullable(),
  paymentStatus: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month")
  const year = searchParams.get("year")

  let dateFilter = {}
  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59)
    dateFilter = { startTime: { gte: start, lte: end } }
  }

  const appointments = await prisma.appointment.findMany({
    where: { userId: session.user.id, ...dateFilter },
    include: { client: { include: TAG_MEMBERSHIP_INCLUDE }, service: true },
    orderBy: { startTime: "asc" },
  })

  return NextResponse.json(
    appointments.map((a) => ({ ...a, client: a.client ? withTag(a.client) : a.client })),
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    console.log("[agendamentos POST] body recebido:", JSON.stringify(body))

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const fields = parsed.error.issues.map((e) => `${e.path.map(String).join(".")}: ${e.message}`).join(", ")
      console.error("[agendamentos POST] validação falhou:", fields)
      return NextResponse.json({ error: `Campos inválidos: ${fields}` }, { status: 400 })
    }
    const data = parsed.data

    // Recompra herda o clique do anúncio (fbc) da última compra da cliente,
    // enquanto ainda estiver dentro da janela de 28 dias da Meta.
    const lastWithFbc = await prisma.appointment.findFirst({
      where: { clientId: data.clientId, userId: session.user.id, fbc: { not: null } },
      orderBy: { startTime: "desc" },
      select: { fbc: true },
    })
    const fbcHerdado = fbcIsFresh(lastWithFbc?.fbc) ? lastWithFbc?.fbc ?? null : null

    const [appointment, client, fichaExistente] = await Promise.all([
      prisma.appointment.create({
        data: {
          userId: session.user.id,
          clientId: data.clientId,
          serviceId: data.serviceId || null,
          title: data.title,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          notes: data.notes || null,
          motivo: data.motivo || null,
          meetingLink: data.meetingLink || null,
          amountPaid: data.amountPaid ?? null,
          paymentStatus: data.paymentStatus ?? null,
          fbc: fbcHerdado,
        },
        include: { client: true, service: true },
      }),
      prisma.client.findUnique({
        where: { id: data.clientId },
        select: { birthDate: true, person2Name: true, person2BirthDate: true },
      }),
      prisma.ficha.findFirst({
        where: { clientId: data.clientId, userId: session.user.id, type: "INTERNAL" },
        orderBy: { createdAt: "desc" },
      }),
    ])

    const startDate = new Date(data.startTime)
    const dateLabel = startDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" })
    const involvedPeople = client?.person2Name
      ? [{ name: client.person2Name, birthDate: client.person2BirthDate?.toISOString().slice(0, 10) ?? "", relation: "" }]
      : []

    if (!fichaExistente) {
      // Não tem ficha: cria, populando dados da cliente
      await prisma.ficha.create({
        data: {
          userId: session.user.id,
          clientId: data.clientId,
          serviceId: data.serviceId || null,
          type: "INTERNAL",
          topicsAddressed: data.motivo ? `[${dateLabel}] ${data.motivo}` : null,
          clientQuestions: data.perguntas ? `[${dateLabel}] ${data.perguntas}` : null,
          involvedPeople,
        },
      })
    } else if (data.motivo || data.perguntas) {
      // Tem ficha: acrescenta motivo e/ou perguntas
      const updateData: Record<string, string> = {}
      if (data.motivo) {
        const anteriorTopics = fichaExistente.topicsAddressed ?? ""
        const motivoEntry = `[${dateLabel}] ${data.motivo}`
        updateData.topicsAddressed = anteriorTopics ? `${anteriorTopics}\n${motivoEntry}` : motivoEntry
      }
      if (data.perguntas) {
        const anteriorQuestions = fichaExistente.clientQuestions ?? ""
        const perguntasEntry = `[${dateLabel}] ${data.perguntas}`
        updateData.clientQuestions = anteriorQuestions ? `${anteriorQuestions}\n${perguntasEntry}` : perguntasEntry
      }
      await prisma.ficha.update({
        where: { id: fichaExistente.id },
        data: updateData,
      })
    }

    // [META CAPI DESATIVADO] — reativar quando houver solução de atribuição para recompras
    // if (data.paymentStatus === "Pago") {
    //   await fireCAPIEvent(appointment.id, data.clientId, data.amountPaid ?? 0, session.user.id)
    // }

    return NextResponse.json(appointment, { status: 201 })
  } catch (err) {
    console.error("[agendamentos POST] erro Prisma:", err)
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
