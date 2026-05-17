import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, plan: true,
        logoUrl: true, reportBg: true,
        signature: true, slogan: true,
        reportTitleFont: true, reportTitleColor: true,
        reportSignatureFont: true, reportSignatureColor: true,
        reportFont: true, reportTextColor: true, reportAccentColor: true,
      },
    })
    return NextResponse.json(user)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[perfil GET]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const allowed = [
      "name", "logoUrl", "reportBg", "signature", "slogan",
      "reportTitleFont", "reportTitleColor",
      "reportSignatureFont", "reportSignatureColor",
      "reportFont", "reportTextColor", "reportAccentColor",
    ]
    const data = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    )

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true, name: true,
        logoUrl: true, reportBg: true,
        signature: true, slogan: true,
        reportTitleFont: true, reportTitleColor: true,
        reportSignatureFont: true, reportSignatureColor: true,
        reportFont: true, reportTextColor: true, reportAccentColor: true,
      },
    })

    return NextResponse.json(user)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[perfil PUT]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
