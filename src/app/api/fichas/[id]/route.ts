import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  serviceId: z.string().optional().or(z.literal("")),
  mainSubject: z.string().nullable().optional(),
  productName: z.string().nullable().optional(),
  involvedPeople: z.array(z.object({
    name: z.string(),
    birthDate: z.string().optional(),
    relation: z.string().optional(),
  })).optional(),
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
  sessionCards: z.array(z.object({
    card: z.string(),
    interpretation: z.string().optional(),
  })).optional(),
  topicsAddressed: z.string().nullable().optional(),
  energeticObservations: z.string().nullable().optional(),
  therapeuticSuggestions: z.string().nullable().optional(),
  returnSchedule: z.string().nullable().optional(),
  // Links
  links: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)

    await prisma.ficha.updateMany({
      where: { id, userId: session.user.id },
      data: {
        serviceId: data.serviceId || null,
        mainSubject: data.mainSubject,
        productName: data.productName,
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
        links: data.links ?? [],
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[fichas PUT]", msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.ficha.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
