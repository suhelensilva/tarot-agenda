import { createHash } from "crypto"

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

export interface CAPIEventPayload {
  appointmentId: string
  clientId: string
  clientName: string
  clientPhone: string
  clientEmail?: string | null
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

  const userData: Record<string, string[]> = {
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

  const eventData: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: `purchase_${appointmentId}`,  // deduplicação — único por agendamento
    action_source: "website",
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
