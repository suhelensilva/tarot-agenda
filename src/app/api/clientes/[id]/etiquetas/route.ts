import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

/** GET — etiquetas atribuídas à cliente */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id: clientId } = await params

  const members = await prisma.crmListMember.findMany({
    where: { clientId, list: { userId: session.user.id } },
    include: { list: true },
  })

  return NextResponse.json(members.map((m) => m.list))
}

/** POST — adiciona etiqueta à cliente */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id: clientId } = await params

  const { listId, reason } = z.object({ listId: z.string(), reason: z.string().optional().nullable() }).parse(await req.json())

  // Verifica que a etiqueta pertence ao user
  const list = await prisma.crmList.findFirst({ where: { id: listId, userId: session.user.id } })
  if (!list) return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 })

  await prisma.crmListMember.upsert({
    where: { listId_clientId: { listId, clientId } },
    create: { listId, clientId, reason: reason ?? null },
    update: { reason: reason ?? null },
  })
  return NextResponse.json({ ok: true })
}

/** PATCH — atualiza o motivo de uma etiqueta */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id: clientId } = await params
  const { listId, reason } = z.object({ listId: z.string(), reason: z.string().nullable() }).parse(await req.json())

  await prisma.crmListMember.updateMany({
    where: { listId, clientId, list: { userId: session.user.id } },
    data: { reason: reason ?? null },
  })

  return NextResponse.json({ ok: true })
}

/** DELETE — remove etiqueta da cliente */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { id: clientId } = await params
  const { listId } = z.object({ listId: z.string() }).parse(await req.json())

  await prisma.crmListMember.deleteMany({
    where: { listId, clientId, list: { userId: session.user.id } },
  })
  return NextResponse.json({ ok: true })
}
