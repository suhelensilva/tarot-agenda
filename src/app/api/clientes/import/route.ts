import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlanLimits } from "@/lib/plan"

// Parse a CSV line respecting quoted fields
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const limits = getPlanLimits(session.user.plan)
  if (!limits.importExport) {
    return NextResponse.json(
      { error: "Importação de contatos disponível a partir do plano Pró.", code: "PLAN_LIMIT" },
      { status: 403 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 })

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "")

    if (lines.length < 2) {
      return NextResponse.json({ error: "Arquivo vazio ou sem dados" }, { status: 400 })
    }

    // Detect header: first line
    const headerLine = parseCsvLine(lines[0])
    // Map header columns (case-insensitive, trim)
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")
    const headers = headerLine.map(normalize)

    // Column indexes — support our own export format and common variations
    const idx = {
      name: headers.findIndex((h) => h === "nome" || h === "name"),
      phone: headers.findIndex((h) =>
        ["telefone", "phone", "celular", "whatsapp", "tel"].includes(h)
      ),
      email: headers.findIndex((h) => h === "email"),
      birthDate: headers.findIndex((h) =>
        ["datanascimento", "datadenascimento", "birthdate", "nascimento", "aniversario"].includes(h)
      ),
      notes: headers.findIndex((h) =>
        ["observacoes", "observaes", "notes", "notas", "obs"].includes(h)
      ),
    }

    if (idx.name === -1 || idx.phone === -1) {
      return NextResponse.json(
        { error: "O CSV precisa ter colunas 'Nome' e 'Telefone'" },
        { status: 400 }
      )
    }

    const dataRows = lines.slice(1)
    let created = 0
    let skipped = 0

    for (const line of dataRows) {
      const cols = parseCsvLine(line)
      const name = cols[idx.name] || ""
      const phone = cols[idx.phone] || ""

      if (!name || !phone) {
        skipped++
        continue
      }

      const email = idx.email >= 0 ? cols[idx.email] || null : null
      const birthDateRaw = idx.birthDate >= 0 ? cols[idx.birthDate] || null : null
      const notes = idx.notes >= 0 ? cols[idx.notes] || null : null

      let birthDate: Date | null = null
      if (birthDateRaw) {
        const d = new Date(birthDateRaw)
        if (!isNaN(d.getTime())) birthDate = d
      }

      try {
        await prisma.client.create({
          data: {
            userId: session.user.id,
            name,
            phone,
            email: email && email.includes("@") ? email : null,
            birthDate,
            notes,
          },
        })
        created++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({ created, skipped })
  } catch (err) {
    console.error("[clientes import]", err)
    return NextResponse.json({ error: "Erro ao processar arquivo" }, { status: 500 })
  }
}
