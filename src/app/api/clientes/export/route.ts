import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: {
      name: true,
      phone: true,
      email: true,
      birthDate: true,
      notes: true,
      createdAt: true,
    },
  })

  const header = ["Nome", "Telefone", "Email", "Data de Nascimento", "Observações", "Cadastrado em"]
  const escape = (v: string | null | undefined) => {
    if (v == null) return ""
    const s = String(v).replace(/"/g, '""')
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s
  }

  const rows = clients.map((c) => [
    escape(c.name),
    escape(c.phone),
    escape(c.email),
    c.birthDate ? c.birthDate.toISOString().slice(0, 10) : "",
    escape(c.notes),
    c.createdAt.toISOString().slice(0, 10),
  ].join(","))

  const csv = [header.join(","), ...rows].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-misticagenda.csv"`,
    },
  })
}
