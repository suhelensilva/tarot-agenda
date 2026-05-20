import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ subscription })
}
