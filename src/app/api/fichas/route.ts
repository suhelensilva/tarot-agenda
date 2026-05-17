import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const involvedPersonSchema = z.object({
  name: z.string(),
  birthDate: z.string().optional(),
  relation: z.string().optional(),
})

const sessionCardSchema = z.object({
  card: z.string(),
  interpretation: z.string().optional(),
})

const schema = z.object({
  clientId: z.string().min(1),
  type: z.enum(["INTERNAL", "REPORT"]),
  serviceId: z.string().optional().or(z.literal("")),
  mainSubject: z.string().nullable().optional(),
  productName: z.string().nullable().optional(),
  removeBg: z.boolean().optional(),
  involvedPeople: z.array(involvedPersonSchema).optional(),
  // Relatório
  mainComplaint: z.string().nullable().optional(),
  complaintText: z.string().nullable().optional(),
  questions: z.array(z.object({
    question: z.string(),
    cards: z.string().nullable().optional(),
    interpretation: z.string().nullable().optional(),
  })).optional(),
  energeticTips: z.string().nullable().optional(),
  spiritualPractice: z.string().nullable().optional(),
  additionalServices: z.string().nullable().optional(),
  // Ficha Interna
  sessionCards: z.array(sessionCardSchema).optional(),
  topicsAddressed: z.string().nullable().optional(),
  energeticObservations: z.string().nullable().optional(),
  therapeuticSuggestions: z.string().nullable().optional(),
  returnSchedule: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")

  try {
    const fichas = await prisma.ficha.findMany({
      where: { userId: session.user.id, ...(clientId ? { clientId } : {}) },
      include: { client: { select: { id: true, name: true, birthDate: true } } },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(fichas)
  } catch (err) {
    console.error("[fichas GET]", err)
    return NextResponse.json({ error: "Erro ao buscar fichas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    console.log("[fichas POST] body recebido, clientId:", body?.clientId, "type:", body?.type)

    const data = schema.parse(body)

    const ficha = await prisma.ficha.create({
      data: {
        userId: session.user.id,
        clientId: data.clientId,
        type: data.type,
        serviceId: data.serviceId || null,
        mainSubject: data.mainSubject,
        productName: data.productName,
        removeBg: data.removeBg ?? false,
        involvedPeople: data.involvedPeople ?? [],
        mainComplaint: data.mainComplaint,
        complaintText: data.complaintText,
        questions: data.questions ?? [],
        energeticTips: data.energeticTips,
        spiritualPractice: data.spiritualPractice,
        additionalServices: data.additionalServices,
        sessionCards: data.sessionCards ?? [],
        topicsAddressed: data.topicsAddressed,
        energeticObservations: data.energeticObservations,
        therapeuticSuggestions: data.therapeuticSuggestions,
        returnSchedule: data.returnSchedule,
      },
    })

    console.log("[fichas POST] criada com sucesso:", ficha.id)
    return NextResponse.json({ ok: true, id: ficha.id }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[fichas POST] ERRO:", msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
