import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getUserFromToken, normalizePhone } from "@/lib/crm-auth"
import { buildContact, findClientByPhone } from "@/lib/crm"

const schema = z.object({
  phone: z.string().min(1),
  name: z.string().optional(),
  amount: z.number().positive(),
  productName: z.string().optional(),
  source: z.enum(["whatsapp", "manual", "ad"]).optional(),
  ctwaClid: z.string().optional(),
  purchasedAt: z.string().optional(), // ISO; default = agora
})

// POST /api/crm/purchase
// Registra uma compra. Cria a cliente se ainda não existir (find-or-create pelo telefone).
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

  // Find-or-create da cliente pelo telefone
  let client = await findClientByPhone(user.id, data.phone)
  if (!client) {
    client = await prisma.client.create({
      data: {
        userId: user.id,
        name: data.name?.trim() || "Cliente WhatsApp",
        phone: normalizePhone(data.phone),
      },
    })
  } else if (data.name?.trim() && (client.name === "Cliente WhatsApp" || !client.name)) {
    // Atualiza o nome se a cliente tinha sido criada sem nome de verdade
    client = await prisma.client.update({
      where: { id: client.id },
      data: { name: data.name.trim() },
    })
  }

  await prisma.purchase.create({
    data: {
      userId: user.id,
      clientId: client.id,
      amount: data.amount,
      productName: data.productName?.trim() || null,
      source: data.source ?? "whatsapp",
      ctwaClid: data.ctwaClid || null,
      purchasedAt: data.purchasedAt ? new Date(data.purchasedAt) : undefined,
    },
  })

  const contact = await buildContact(user.id, client.id)
  return NextResponse.json(contact, { status: 201 })
}
