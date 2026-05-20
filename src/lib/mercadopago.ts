import { MercadoPagoConfig, Payment } from "mercadopago"

export function getMPClient() {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado")
  return new MercadoPagoConfig({ accessToken: token, options: { timeout: 5000 } })
}

export const MP_PUBLIC_KEY = process.env.MP_PUBLIC_KEY ?? ""

export { Payment }

// Preços
export const PLAN_PRICES = {
  PRO: {
    MONTHLY: 19.90,
    ANNUAL:  180.00, // 15,00 × 12
  },
  PREMIUM: {
    MONTHLY: 29.90,
    ANNUAL:  240.00, // 20,00 × 12
  },
}

export const PLAN_NAMES = {
  PRO:     "Pró",
  PREMIUM: "Premium",
}
