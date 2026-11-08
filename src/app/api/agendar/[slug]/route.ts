import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { addMinutes } from "date-fns"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const user = await prisma.user.findUnique({
    where: { id: slug },
    select: {
      id: true,
      name: true,
      plan: true,
      publicBio: true,
      publicTheme: true,
      publicFont: true,
      publicBgColor: true,
      publicButtonColor: true,
      publicButtonTextColor: true,
      publicPhotoUrl: true,
      availability: true,
      publicButtons: {
        where: { active: true },
        orderBy: { order: "asc" },
      },
      services: {
        where: { active: true, showOnPublicLink: true },
        select: { id: true, name: true, price: true, duration: true },
      },
    },
  })

  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  // Um pixelId da taróloga só para setar o cookie _fbp no navegador da cliente.
  // O _fbp é por domínio, então qualquer pixel dela serve.
  const firstPixel = await prisma.metaPixel.findFirst({
    where: { userId: user.id },
    select: { pixelId: true },
    orderBy: { createdAt: "asc" },
  })
  const metaPixelId = firstPixel?.pixelId ?? null

  // Aplica restrições por plano antes de retornar
  const plan = user.plan ?? "FREE"

  if (plan === "FREE") {
    // FREE: sem personalização nenhuma
    return NextResponse.json({
      ...user,
      plan,
      metaPixelId,
      publicBio: null,
      publicTheme: "BASIC",
      publicFont: null,
      publicBgColor: null,
      publicButtonColor: null,
      publicButtonTextColor: null,
      publicPhotoUrl: null,
    })
  }

  if (plan === "PRO") {
    // PRO: pode usar cor dos botões, mas tema fixo e sem foto/bio/fonte
    return NextResponse.json({
      ...user,
      plan,
      metaPixelId,
      publicBio: null,
      publicTheme: "BASIC",
      publicFont: null,
      publicBgColor: null,
      publicPhotoUrl: null,
    })
  }

  // PREMIUM: tudo liberado
  return NextResponse.json({ ...user, plan, metaPixelId })
}

const bookSchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string(),
  startTime: z.string(),
  // Sinais de correspondência da Meta (enviados pelo navegador da cliente)
  fbp: z.string().optional().nullable(),
  fbc: z.string().optional().nullable(),
  fbclid: z.string().optional().nullable(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const user = await prisma.user.findUnique({ where: { id: slug } })
  if (!user) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  try {
    const body = await req.json()
    const data = bookSchema.parse(body)

    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, userId: slug, active: true },
    })
    if (!service) return NextResponse.json({ error: "Serviço inválido" }, { status: 400 })

    let client = await prisma.client.findFirst({
      where: { userId: slug, phone: data.clientPhone },
    })

    if (!client) {
      client = await prisma.client.create({
        data: { userId: slug, name: data.clientName, phone: data.clientPhone },
      })
    }

    const start = new Date(`${data.date}T${data.startTime}:00`)
    const end = addMinutes(start, service.duration)

    // Sinais de correspondência da Meta: IP e user agent vêm da requisição;
    // fbc é o cookie _fbc OU reconstruído a partir do fbclid da URL do anúncio.
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null
    const clientUserAgent = req.headers.get("user-agent") || null
    const fbc =
      data.fbc?.trim() ||
      (data.fbclid?.trim() ? `fb.1.${Date.now()}.${data.fbclid.trim()}` : null)
    const fbp = data.fbp?.trim() || null

    const appointment = await prisma.appointment.create({
      data: {
        userId: slug,
        clientId: client.id,
        serviceId: service.id,
        title: `${service.name} — ${data.clientName}`,
        startTime: start,
        endTime: end,
        amountPaid: service.price,
        fbp,
        fbc,
        clientIp,
        clientUserAgent,
      },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (err) {
    console.error("[agendar POST]", err)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }
}
