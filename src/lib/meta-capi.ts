import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"

// SHA256 com lowercase + trim
function h(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

// Normaliza telefone BR para E.164 sem o + (ex: "5511999998888")
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length >= 12) return digits
  return "55" + digits
}

// Separa primeiro e último nome
function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return { fn: parts[0] ?? "", ln: parts.slice(1).join(" ") || parts[0] || "" }
}

// fbc = "fb.1.<timestamp do clique>.<fbclid>". A Meta só atribui clique de até 28 dias.
const FB_CLICK_WINDOW_MS = 28 * 24 * 60 * 60 * 1000
export function fbcIsFresh(fbc: string | null | undefined): boolean {
  const m = fbc?.match(/^fb\.\d+\.(\d{10,13})\./)
  if (!m) return false
  const ts = Number(m[1])
  const ms = ts < 1e12 ? ts * 1000 : ts
  return Date.now() - ms < FB_CLICK_WINDOW_MS
}

// Data de nascimento no formato que a Meta espera: YYYYMMDD (ex: 19971226)
function formatBirthDate(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return undefined
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

export interface CAPIEventPayload {
  appointmentId: string
  clientId: string
  clientName: string
  clientPhone: string
  clientEmail?: string | null
  clientBirthDate?: Date | string | null
  // Sinais de navegador capturados no agendamento (elevam a qualidade da correspondência)
  fbp?: string | null
  fbc?: string | null
  clientIp?: string | null
  clientUserAgent?: string | null
  amountPaid: number
  isFirstPurchase: boolean
  pixelId: string
  accessToken: string
  testEventCode?: string | null
}

export async function sendPurchaseEvent(payload: CAPIEventPayload): Promise<{ ok: boolean; error?: string; code?: number; raw?: string; events_received?: number; fbtrace_id?: string }> {
  const {
    appointmentId, clientId, clientName, clientPhone, clientEmail,
    amountPaid, isFirstPurchase, pixelId, accessToken, testEventCode,
  } = payload

  const { fn, ln } = splitName(clientName)
  const phoneNorm = normalizePhone(clientPhone)

  const userData: Record<string, unknown> = {
    // Telefone hasheado — principal para EMQ sem email
    ph: [h(phoneNorm)!],
    // external_id = ID estável do cliente no banco (hasheado por boas práticas)
    external_id: [h(clientId)!],
    // Nome separado
    fn: [h(fn)!],
    ln: [h(ln)!],
    // País fixo BR
    country: [h("br")!],
  }

  if (clientEmail) {
    userData.em = [h(clientEmail)!]
  }

  // Data de nascimento (db) — sinal extra de correspondência quando a cliente tem no cadastro
  const db = formatBirthDate(payload.clientBirthDate)
  if (db) {
    userData.db = [h(db)!]
  }

  // fbp / fbc — cookies do navegador da cliente capturados no agendamento. Strings simples, NÃO hasheadas.
  if (payload.fbp) userData.fbp = payload.fbp
  if (payload.fbc) userData.fbc = payload.fbc
  // IP e user agent — strings simples em user_data, ajudam a correspondência.
  if (payload.clientIp) userData.client_ip_address = payload.clientIp
  if (payload.clientUserAgent) userData.client_user_agent = payload.clientUserAgent

  const eventData: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: `purchase_${appointmentId}`,  // deduplicação — único por agendamento
    action_source: "website",                // venda real (PIX/WhatsApp), tratada como conversão de site
    user_data: userData,
    custom_data: {
      currency: "BRL",
      value: amountPaid,
      order_type: isFirstPurchase ? "new_client" : "returning_client",
    },
  }

  const body: Record<string, unknown> = {
    data: [eventData],
    access_token: accessToken,
  }

  if (testEventCode) {
    body.test_event_code = testEventCode
  }

  const bodyStr = JSON.stringify(body)
  console.log("[meta-capi] PAYLOAD ENVIADO:", JSON.stringify({ ...body, access_token: "***" }))

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr,
      }
    )

    const rawText = await res.text()
    console.log(`[meta-capi] STATUS HTTP: ${res.status}`)
    console.log("[meta-capi] RESPOSTA META:", rawText)

    let json: { events_received?: number; fbtrace_id?: string; error?: { message: string; code?: number } }
    try { json = JSON.parse(rawText) } catch { json = {} }

    if (!res.ok || json.error) {
      return { ok: false, error: json.error?.message ?? "Erro desconhecido", code: json.error?.code, raw: rawText }
    }

    return { ok: true, events_received: json.events_received, fbtrace_id: json.fbtrace_id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro de rede"
    console.error("[meta-capi] Falha de rede:", msg)
    return { ok: false, error: msg }
  }
}

export async function fireCAPIEvent(
  appointmentId: string,
  clientId: string | null,
  amountPaid: number,
  userId: string,
): Promise<unknown> {
  console.log(`[fireCAPIEvent] INICIO: appointment=${appointmentId} client=${clientId} valor=${amountPaid}`)
  if (!clientId) {
    console.warn("[fireCAPIEvent] PULOU: sem clientId")
    return { skipped: "sem clientId" }
  }

  try {
    const [client, completedCount, appointment] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, phone: true, email: true, birthDate: true },
      }),
      prisma.appointment.count({
        where: { clientId, userId, status: "COMPLETED", paymentStatus: "Pago" },
      }),
      prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { fbp: true, fbc: true, clientIp: true, clientUserAgent: true },
      }),
    ])
    if (!client) {
      console.warn("[fireCAPIEvent] PULOU: cliente nao encontrado no banco")
      return { skipped: "cliente nao encontrado" }
    }

    // A etiqueta da cliente é a lista (CrmListMember) em que ela está.
    // Pixel vem da lista (CrmList.metaPixel).
    const memberships = await prisma.crmListMember.findMany({
      where: { clientId, list: { userId } },
      include: {
        list: {
          include: {
            metaPixel: { select: { pixelId: true, accessToken: true, testEventCode: true } },
          },
        },
      },
    })

    const pixelMap = new Map<string, { pixelId: string; accessToken: string; testEventCode: string | null }>()
    for (const m of memberships) {
      if (m.list.metaPixel) pixelMap.set(m.list.metaPixel.pixelId, m.list.metaPixel)
    }
    const pixels = [...pixelMap.values()]

    console.log(`[fireCAPIEvent] etiquetas (listas): ${memberships.map((m) => m.list.name).join(", ") || "(nenhuma)"}; pixels: ${pixels.length}`)
    if (pixels.length === 0) {
      console.warn(`[fireCAPIEvent] PULOU: cliente sem pixel. Listas da cliente: ${memberships.map((m) => m.list.name).join(", ") || "(nenhuma)"}`)
      return { skipped: "sem pixels", listas: memberships.map((m) => m.list.name) }
    }
    console.log(`[fireCAPIEvent] vai disparar para ${pixels.length} pixel(s):`, JSON.stringify(pixels.map((p) => p.pixelId)))

    const isFirstPurchase = completedCount === 0

    const results = await Promise.all(
      pixels.map((pixel) =>
        sendPurchaseEvent({
          appointmentId,
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          clientEmail: client.email,
          clientBirthDate: client.birthDate,
          fbp: appointment?.fbp,
          fbc: appointment?.fbc,
          clientIp: appointment?.clientIp,
          clientUserAgent: appointment?.clientUserAgent,
          amountPaid,
          isFirstPurchase,
          pixelId: pixel.pixelId,
          accessToken: pixel.accessToken,
          testEventCode: pixel.testEventCode,
        })
      )
    )
    return { fired: true, results }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[fireCAPIEvent] erro:", msg)
    return { error: msg }
  }
}
