import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { dateLabelBR, splitEntries, findEntry, entryText } from "@/lib/ficha-questions"
// import { fireCAPIEvent } from "@/lib/meta-capi" // META CAPI DESATIVADO

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]).optional(),
  cancellationReason: z.string().optional(),
  amountPaid: z.number().optional(),
  paymentStatus: z.string().optional().nullable(),
  deliveryFormat: z.string().optional().nullable(),
})

const editSchema = z.object({
  clientId: z.string(),
  serviceId: z.string().optional().nullable(),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional().nullable(),
  motivo: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  amountPaid: z.number().optional().nullable(),
  deliveryFormat: z.string().optional().nullable(),
  perguntas: z.string().optional().nullable(),
})

/** Perguntas que estão na ficha para o dia deste agendamento. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  const apt = await prisma.appointment.findFirst({
    where: { id, userId: session.user.id },
    select: { startTime: true, clientId: true },
  })
  if (!apt) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })

  const label = dateLabelBR(apt.startTime)
  const fichas = await prisma.ficha.findMany({
    where: { clientId: apt.clientId, userId: session.user.id, type: "INTERNAL" },
    orderBy: { createdAt: "desc" },
    select: { clientQuestions: true },
  })
  for (const f of fichas) {
    const entries = splitEntries(f.clientQuestions)
    const i = findEntry(entries, label)
    if (i >= 0) return NextResponse.json({ perguntas: entryText(entries[i]) })
  }
  return NextResponse.json({ perguntas: "" })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
      const fields = parsed.error.issues.map((e) => `${e.path.map(String).join(".")}: ${e.message}`).join(", ")
      console.error("[agendamentos PATCH] validação falhou:", fields)
      return NextResponse.json({ error: `Campos inválidos: ${fields}` }, { status: 400 })
    }

    // Busca estado anterior para detectar mudança de paymentStatus
    const before = await prisma.appointment.findFirst({
      where: { id, userId: session.user.id },
      select: { paymentStatus: true, amountPaid: true, clientId: true },
    })

    // Data do pagamento: entra no financeiro no dia em que foi marcado como Pago.
    const ps = parsed.data.paymentStatus
    const paidAt =
      ps === undefined ? undefined
      : ps === "Pago" ? (before?.paymentStatus === "Pago" ? undefined : new Date())
      : null

    await prisma.appointment.updateMany({
      where: { id, userId: session.user.id },
      data: { ...parsed.data, ...(paidAt !== undefined ? { paidAt } : {}) },
    })

    // [META CAPI DESATIVADO] — reativar quando houver solução de atribuição para recompras
    // if (parsed.data.paymentStatus === "Pago" && before?.paymentStatus !== "Pago") {
    //   await fireCAPIEvent(id, before?.clientId ?? null, parsed.data.amountPaid ?? before?.amountPaid ?? 0, session.user.id)
    // }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[agendamentos PATCH]", err)
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    console.log("[agendamentos PUT] body recebido:", JSON.stringify(body))

    const parsed = editSchema.safeParse(body)
    if (!parsed.success) {
      const fields = parsed.error.issues.map((e) => `${e.path.map(String).join(".")}: ${e.message}`).join(", ")
      console.error("[agendamentos PUT] validação falhou:", fields)
      return NextResponse.json({ error: `Campos inválidos: ${fields}` }, { status: 400 })
    }
    const data = parsed.data

    const before = await prisma.appointment.findFirst({
      where: { id, userId: session.user.id },
      select: { startTime: true, clientId: true },
    })
    if (!before) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })

    // Perguntas: substitui a entrada daquele dia na ficha (ou acrescenta, se não havia)
    if (data.perguntas !== undefined) {
      const oldLabel = dateLabelBR(before.startTime)
      const newLabel = dateLabelBR(new Date(data.startTime))
      const text = data.perguntas?.trim() ?? ""
      const fichas = await prisma.ficha.findMany({
        where: { clientId: before.clientId, userId: session.user.id, type: "INTERNAL" },
        orderBy: { createdAt: "desc" },
        select: { id: true, clientQuestions: true },
      })
      const owner = fichas.find((f) => findEntry(splitEntries(f.clientQuestions), oldLabel) >= 0)
      if (owner) {
        const entries = splitEntries(owner.clientQuestions)
        const i = findEntry(entries, oldLabel)
        if (text) entries[i] = `[${newLabel}] ${text}`
        else entries.splice(i, 1)
        await prisma.ficha.update({ where: { id: owner.id }, data: { clientQuestions: entries.join("\n") || null } })
      } else if (text && fichas[0]) {
        const cur = fichas[0].clientQuestions
        const entry = `[${newLabel}] ${text}`
        await prisma.ficha.update({ where: { id: fichas[0].id }, data: { clientQuestions: cur ? `${cur}\n${entry}` : entry } })
      }
    }

    await prisma.appointment.updateMany({
      where: { id, userId: session.user.id },
      data: {
        clientId: data.clientId,
        serviceId: data.serviceId ?? null,
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes ?? null,
        motivo: data.motivo ?? null,
        meetingLink: data.meetingLink ?? null,
        amountPaid: data.amountPaid ?? null,
        ...(data.deliveryFormat !== undefined ? { deliveryFormat: data.deliveryFormat || null } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[agendamentos PUT]", err)
    const msg = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  await prisma.appointment.deleteMany({ where: { id, userId: session.user.id } })

  return NextResponse.json({ ok: true })
}
