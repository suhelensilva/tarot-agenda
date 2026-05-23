import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
})

// Price IDs criados no Stripe Dashboard (configurar via env)
export const STRIPE_PRICES = {
  PRO: {
    MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    ANNUAL:  process.env.STRIPE_PRICE_PRO_ANNUAL!,
  },
  PREMIUM: {
    MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY!,
    ANNUAL:  process.env.STRIPE_PRICE_PREMIUM_ANNUAL!,
  },
} as const

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
