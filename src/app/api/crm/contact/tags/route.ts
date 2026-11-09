import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getUserFromToken, normalizePhone } from "@/lib/crm-auth"
import { buildContact, findClientByPhone } from "@/lib/crm"
import { syncClientTagFromLists } from "@/lib/client-tag"

const schema = z.object({
  phone: z.string().min(1),
  name: z.string().optional(),
  listId: z.string().min(1),
  action: z.enum(["add", "remove"]),
})

// POST /api/crm/contact/tags
// Adiciona ou remove a cliente de uma lista/etiqueta. Cria a cliente se não existir.
export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req)
  if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

  let data: z.infer<typeof schema>
  try {
    data = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  if (!normalizePhone(data.phone)) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 })
  }

  // A lista precisa ser do próprio usuário
  const list = await prisma.crmList.findFirst({ where: { id: data.listId, userId: user.id } })
  if (!list) return NextResponse.json({ error: "Lista não encontrada" }, { status: 404 })

  // Find-or-create da cliente
  let client = await findClientByPhone(user.id, data.phone)
  if (!client) {
    client = await prisma.client.create({
      data: {
        userId: user.id,
        name: data.name?.trim() || "Cliente WhatsApp",
        phone: normalizePhone(data.phone),
      },
    })
  }

  if (data.action === "add") {
    await prisma.crmListMember.upsert({
      where: { listId_clientId: { listId: list.id, clientId: client.id } },
      create: { listId: list.id, clientId: client.id },
      update: {},
    })
  } else {
    await prisma.crmListMember.deleteMany({
      where: { listId: list.id, clientId: client.id },
    })
  }
  await syncClientTagFromLists(client.id)

  const contact = await buildContact(user.id, client.id)
  return NextResponse.json(contact)
}
