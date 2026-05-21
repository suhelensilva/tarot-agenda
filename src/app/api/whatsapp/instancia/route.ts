import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isConfigured, createInstance, deleteInstance, getInstanceInfo } from "@/lib/evolution"

/** POST — cria ou reconecta a instância da usuária */
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  if (!isConfigured()) {
    return NextResponse.json({ error: "Evolution API não configurada no servidor" }, { status: 503 })
  }

  const instanceName = `mistica_${session.user.id}`

  try {
    // Tenta criar (se já existir, a API retorna o estado atual)
    const result = await createInstance(instanceName)

    // Salva/atualiza no banco
    await prisma.whatsappConfig.upsert({
      where: { userId: session.user.id },
      update: { instanceId: instanceName, connected: false },
      create: { userId: session.user.id, instanceId: instanceName, connected: false },
    })

    return NextResponse.json({ ok: true, instanceName, qr: result })
  } catch (err) {
    console.error("[whatsapp/instancia POST]", err)
    // Pode ser que a instância já exista — busca info
    try {
      const info = await getInstanceInfo(instanceName)
      if (info) {
        return NextResponse.json({ ok: true, instanceName, alreadyExists: true })
      }
    } catch { /* ignora */ }
    const msg = err instanceof Error ? err.message : "Erro ao criar instância"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** DELETE — desconecta e remove a instância */
export async function DELETE() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  if (!isConfigured()) {
    return NextResponse.json({ error: "Evolution API não configurada" }, { status: 503 })
  }

  const instanceName = `mistica_${session.user.id}`

  try {
    await deleteInstance(instanceName)
    await prisma.whatsappConfig.updateMany({
      where: { userId: session.user.id },
      data: { connected: false, phoneNumber: null },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[whatsapp/instancia DELETE]", err)
    return NextResponse.json({ error: "Erro ao desconectar" }, { status: 500 })
  }
}
