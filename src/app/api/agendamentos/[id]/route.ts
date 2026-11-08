import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendPurchaseEvent } from "@/lib/meta-capi"

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]).optional(),
  cancellationReason: z.string().optional(),
  amountPaid: z.number().optional(),
  paymentStatus: z.string().optional().nullable(),
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
})

async function fireCAPIEvent(appointmentId: string, clientId: string | null, amountPaid: number, userId: string) {
  console.log(`[fireCAPIEvent] inicio — appt=${appointmentId} client=${clientId} valor=${amountPaid}`)
  if (!clientId) { console.log("[fireCAPIEvent] sem clientId, abortando"); return }

  try {
    const [client, completedCount] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, phone: true, email: true },
      }),
      prisma.appointment.count({
        where: { clientId, userId, status: "COMPLETED", paymentStatus: "Pago" },
      }),
    ])
    console.log(`[fireCAPIEvent] cliente=${client?.name ?? "nao encontrado"} completedCount=${completedCount}`)
    if (!client) return

    const memberships = await prisma.crmListMember.findMany({
      where: { clientId, list: { userId } },
      include: {
        list: {
          include: {
            metaPixel: { select: { pixelId: true, accessToken: true, testEventCode: true } },
          },
        },
      },
    })
    console.log(`[fireCAPIEvent] memberships=${memberships.length} listas=${memberships.map(m => m.list.name + "(pixel=" + (m.list.metaPixel?.pixelId ?? "null") + ")").join(", ")}`)

    const pixels = memberships
      .map((m) => m.list.metaPixel)
      .filter((p): p is NonNullable<typeof p> => p !== null)

    console.log(`[fireCAPIEvent] pixels encontrados=${pixels.length}`)
    if (pixels.length === 0) return

    const isFirstPurchase = completedCount === 0

    await Promise.all(
      pixels.map((pixel) =>
        sendPurchaseEvent({
          appointmentId,
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          clientEmail: client.email,
          amountPaid,
          isFirstPurchase,
          pixelId: pixel.pixelId,
          accessToken: pixel.accessToken,
          testEventCode: pixel.testEventCode,
        })
      )
    )
  } catch (err) {
    console.error("[fireCAPIEvent] erro:", err)
  }
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

    await prisma.appointment.updateMany({
      where: { id, userId: session.user.id },
      data: parsed.data,
    })

    // Dispara CAPI somente quando paymentStatus muda para "Pago"
    const capiTriggered = parsed.data.paymentStatus === "Pago" && before?.paymentStatus !== "Pago"
    if (capiTriggered) {
      void fireCAPIEvent(id, before?.clientId ?? null, parsed.data.amountPaid ?? before?.amountPaid ?? 0, session.user.id)
    }

    return NextResponse.json({
      ok: true,
      _debug: {
        paymentStatusNovo: parsed.data.paymentStatus,
        paymentStatusAntes: before?.paymentStatus,
        clientId: before?.clientId,
        capiTriggered,
      },
    })
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
