import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isConfigured, getConnectionState, getQrCode } from "@/lib/evolution"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  if (!isConfigured()) {
    return NextResponse.json({ configured: false })
  }

  const config = await prisma.whatsappConfig.findUnique({
    where: { userId: session.user.id },
  })

  if (!config) {
    return NextResponse.json({ configured: true, connected: false, instanceExists: false })
  }

  const instanceName = config.instanceId

  try {
    const state = await getConnectionState(instanceName)
    const isOpen = state.state === "open"

    // Atualiza status no banco
    if (isOpen !== config.connected) {
      await prisma.whatsappConfig.update({
        where: { userId: session.user.id },
        data: {
          connected: isOpen,
          phoneNumber: isOpen && state.profileName ? state.profileName : config.phoneNumber,
        },
      })
    }

    if (isOpen) {
      return NextResponse.json({
        configured: true,
        connected: true,
        instanceExists: true,
        profileName: state.profileName,
        instanceName,
      })
    }

    // Não conectado → busca QR code
    try {
      const qr = await getQrCode(instanceName)
      return NextResponse.json({
        configured: true,
        connected: false,
        instanceExists: true,
        qr: qr.base64 ?? null,
        instanceName,
      })
    } catch {
      return NextResponse.json({
        configured: true,
        connected: false,
        instanceExists: true,
        qr: null,
        instanceName,
      })
    }
  } catch (err) {
    console.error("[whatsapp/status GET]", err)
    return NextResponse.json({
      configured: true,
      connected: false,
      instanceExists: false,
      error: err instanceof Error ? err.message : "Erro",
    })
  }
}
