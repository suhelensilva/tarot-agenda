import { prisma } from "@/lib/prisma"
import { normalizePhone } from "@/lib/crm-auth"

export type CrmPurchase = {
  id: string
  amount: number
  productName: string | null
  purchasedAt: string
  source: string
}

export type CrmListTag = {
  id: string
  name: string
  color: string
}

export type CrmContact = {
  found: boolean
  clientId: string | null
  name: string | null
  phone: string | null
  lists: CrmListTag[]
  stats: {
    count: number
    totalSpent: number
    firstPurchase: string | null
    lastPurchase: string | null
    daysSinceLast: number | null
    avgIntervalDays: number | null
    tier: "novo" | "primeira" | "recorrente" | "fiel" | "vip"
    tierLabel: string
    cadenceLabel: string | null
  }
  purchases: CrmPurchase[]
}

/**
 * Procura a cliente de um usuário pelo telefone (comparando só dígitos,
 * casando pelos últimos 8 dígitos pra tolerar DDI/DDD e formatações diferentes).
 */
export async function findClientByPhone(userId: string, phone: string) {
  const digits = normalizePhone(phone)
  if (!digits) return null

  const tail = digits.slice(-8)
  const candidates = await prisma.client.findMany({
    where: { userId, phone: { contains: tail } },
    orderBy: { createdAt: "asc" },
  })

  // Confirma pelos últimos 8 dígitos normalizados
  return candidates.find((c) => normalizePhone(c.phone).slice(-8) === tail) ?? null
}

function tierFor(count: number): { tier: CrmContact["stats"]["tier"]; label: string } {
  if (count <= 0) return { tier: "novo", label: "Novo contato" }
  if (count === 1) return { tier: "primeira", label: "Primeira compra" }
  if (count <= 4) return { tier: "recorrente", label: "Cliente recorrente" }
  if (count <= 9) return { tier: "fiel", label: "Cliente fiel" }
  return { tier: "vip", label: "Cliente VIP" }
}

function cadenceLabel(avgIntervalDays: number | null): string | null {
  if (avgIntervalDays == null) return null
  if (avgIntervalDays <= 2) return "Compra quase todo dia"
  if (avgIntervalDays <= 10) return "Compra toda semana"
  if (avgIntervalDays <= 20) return "Compra a cada 15 dias"
  if (avgIntervalDays <= 45) return "Compra todo mês"
  return `Compra a cada ~${Math.round(avgIntervalDays)} dias`
}

/** Monta o painel completo de uma cliente (stats + histórico). */
export async function buildContact(userId: string, clientId: string): Promise<CrmContact> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
  })
  if (!client) {
    return emptyContact()
  }

  const purchases = await prisma.purchase.findMany({
    where: { userId, clientId },
    orderBy: { purchasedAt: "desc" },
  })

  const memberships = await prisma.crmListMember.findMany({
    where: { clientId, list: { userId } },
    include: { list: true },
    orderBy: { list: { order: "asc" } },
  })
  const lists: CrmListTag[] = memberships.map((m) => ({
    id: m.list.id,
    name: m.list.name,
    color: m.list.color,
  }))

  const count = purchases.length
  const totalSpent = purchases.reduce((s, p) => s + p.amount, 0)
  const sortedAsc = [...purchases].sort(
    (a, b) => a.purchasedAt.getTime() - b.purchasedAt.getTime()
  )
  const first = sortedAsc[0]?.purchasedAt ?? null
  const last = sortedAsc[sortedAsc.length - 1]?.purchasedAt ?? null

  const daysSinceLast =
    last != null ? Math.floor((Date.now() - last.getTime()) / 86_400_000) : null

  let avgIntervalDays: number | null = null
  if (sortedAsc.length >= 2 && first && last) {
    const spanDays = (last.getTime() - first.getTime()) / 86_400_000
    avgIntervalDays = spanDays / (sortedAsc.length - 1)
  }

  const { tier, label } = tierFor(count)

  return {
    found: true,
    clientId: client.id,
    name: client.name,
    phone: client.phone,
    lists,
    stats: {
      count,
      totalSpent,
      firstPurchase: first?.toISOString() ?? null,
      lastPurchase: last?.toISOString() ?? null,
      daysSinceLast,
      avgIntervalDays,
      tier,
      tierLabel: label,
      cadenceLabel: cadenceLabel(avgIntervalDays),
    },
    purchases: purchases.map((p) => ({
      id: p.id,
      amount: p.amount,
      productName: p.productName,
      purchasedAt: p.purchasedAt.toISOString(),
      source: p.source,
    })),
  }
}

export function emptyContact(name: string | null = null, phone: string | null = null): CrmContact {
  return {
    found: false,
    clientId: null,
    name,
    phone,
    lists: [],
    stats: {
      count: 0,
      totalSpent: 0,
      firstPurchase: null,
      lastPurchase: null,
      daysSinceLast: null,
      avgIntervalDays: null,
      tier: "novo",
      tierLabel: "Novo contato",
      cadenceLabel: null,
    },
    purchases: [],
  }
}
