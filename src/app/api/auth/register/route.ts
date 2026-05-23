import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    // Trial de 7 dias com todos os recursos Premium, sem cartão
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        plan: "PREMIUM",
        trialEndsAt,
      },
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error("[register]", err)
    const msg = err instanceof Error ? err.message : "Dados inválidos"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
