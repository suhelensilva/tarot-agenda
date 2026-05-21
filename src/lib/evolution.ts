/**
 * Cliente para a Evolution API (WhatsApp)
 * Docs: https://doc.evolution-api.com
 */

const BASE_URL  = process.env.EVOLUTION_API_URL?.replace(/\/$/, "") ?? ""
const GLOBAL_KEY = process.env.EVOLUTION_API_KEY ?? ""

function headers() {
  return {
    "Content-Type": "application/json",
    "apikey": GLOBAL_KEY,
  }
}

export function isConfigured() {
  return Boolean(BASE_URL && GLOBAL_KEY)
}

/** Cria uma instância nova (uma por usuária) */
export async function createInstance(instanceName: string) {
  const res = await fetch(`${BASE_URL}/instance/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    }),
  })
  if (!res.ok) throw new Error(`Evolution createInstance: ${res.status} ${await res.text()}`)
  return res.json()
}

/** Busca o QR code de uma instância */
export async function getQrCode(instanceName: string) {
  const res = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Evolution getQrCode: ${res.status} ${await res.text()}`)
  return res.json() as Promise<{ code?: string; base64?: string; count?: number }>
}

/** Estado da conexão */
export async function getConnectionState(instanceName: string) {
  const res = await fetch(`${BASE_URL}/instance/connectionState/${instanceName}`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Evolution connectionState: ${res.status} ${await res.text()}`)
  const data = await res.json() as { instance?: { state?: string; profileName?: string; profilePicUrl?: string } }
  return data.instance ?? {}
}

/** Busca info da instância (número conectado) */
export async function getInstanceInfo(instanceName: string) {
  const res = await fetch(`${BASE_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
    headers: headers(),
  })
  if (!res.ok) return null
  const data = await res.json() as Array<{ instance?: { instanceName?: string; status?: string; owner?: string } }>
  return Array.isArray(data) ? data[0] : null
}

/** Apaga/desconecta uma instância */
export async function deleteInstance(instanceName: string) {
  const res = await fetch(`${BASE_URL}/instance/delete/${instanceName}`, {
    method: "DELETE",
    headers: headers(),
  })
  return res.ok
}

/** Envia mensagem de texto */
export async function sendText(instanceName: string, phone: string, text: string) {
  // Garante formato internacional sem +
  const number = phone.replace(/\D/g, "")
  const res = await fetch(`${BASE_URL}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      number,
      text,
    }),
  })
  if (!res.ok) throw new Error(`Evolution sendText: ${res.status} ${await res.text()}`)
  return res.json()
}
