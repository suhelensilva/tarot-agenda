export type Plan = "FREE" | "PRO" | "PREMIUM"

export const PLAN_LIMITS = {
  FREE: {
    clients: 30,
    services: 5,
    fichas: false,
    relatorios: false,
    importExport: false,
    categories: false,
    servicePhotos: false,
  },
  PRO: {
    clients: 80,
    services: -1, // unlimited
    fichas: true,
    relatorios: true,
    importExport: true,
    categories: true,
    servicePhotos: true,
  },
  PREMIUM: {
    clients: -1,
    services: -1,
    fichas: true,
    relatorios: true,
    importExport: true,
    categories: true,
    servicePhotos: true,
  },
} as const

export function getPlanLimits(plan: string | undefined | null) {
  const p = (plan ?? "FREE") as Plan
  return PLAN_LIMITS[p] ?? PLAN_LIMITS.FREE
}

export function planLabel(plan: string | undefined | null) {
  if (plan === "PREMIUM") return "Premium"
  if (plan === "PRO") return "Pró"
  return "Grátis"
}
