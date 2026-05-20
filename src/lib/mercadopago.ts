import { MercadoPagoConfig, Payment, PreApproval, PreApprovalPlan } from "mercadopago"

export function getMPClient() {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado")
  return new MercadoPagoConfig({ accessToken: token })
}

export { Payment, PreApproval, PreApprovalPlan }

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
