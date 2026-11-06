import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, normalizePhone } from "@/lib/crm-auth"
import { buildContact, emptyContact, findClientByPhone } from "@/lib/crm"

// GET /api/crm/contact?phone=5511999999999&name=Fulana
// Retorna o painel da cliente (stats de recorrência + histórico de compras).
export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req)
  if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const phone = searchParams.get("phone") ?? ""
  const name = searchParams.get("name")

  if (!normalizePhone(phone)) {
    return NextResponse.json({ error: "Telefone obrigatório" }, { status: 400 })
  }

  const client = await findClientByPhone(user.id, phone)
  if (!client) {
    return NextResponse.json(emptyContact(name, phone))
  }

  const contact = await buildContact(user.id, client.id)
  return NextResponse.json(contact)
}
