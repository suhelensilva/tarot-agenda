import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateApiToken } from "@/lib/crm-auth"

// GET: retorna o token atual da extensão (ou null se nunca gerou).
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { apiToken: true },
  })

  return NextResponse.json({ token: user?.apiToken ?? null })
}

// POST: gera (ou regenera) o token da extensão.
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const token = generateApiToken()
  await prisma.user.update({
    where: { id: session.user.id },
    data: { apiToken: token },
  })

  return NextResponse.json({ token })
}
