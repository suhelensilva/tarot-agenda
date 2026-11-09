import { prisma } from "@/lib/prisma"

// Etiquetas que a cliente pode ter. Cada uma é uma CrmList (lista do Kanban).
// Casamento por nome ignora acento, maiúsculas, espaço, hífen e "s" final:
// "Paga-pouco" casa com "PAGA POUCO", "Compradora" casa com "COMPRADORAS".
export const TAG_NAMES = ["Compradora", "Paga-pouco", "Cliente R$5"] as const

export function normTag(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/S$/, "")
}

const TAG_KEYS = new Set(TAG_NAMES.map(normTag))

/**
 * Única forma de gravar a etiqueta da cliente.
 * A lista do Kanban (CrmListMember) é a fonte de verdade: a cliente fica só
 * na lista da etiqueta escolhida e sai das outras etiquetas.
 * `tag` vazio/null remove a cliente de todas as etiquetas.
 * Retorna o nome da lista aplicada (ou null).
 */
export async function applyClientTag(
  userId: string,
  clientId: string,
  tag: string | null | undefined,
): Promise<string | null> {
  const client = await prisma.client.findFirst({ where: { id: clientId, userId }, select: { id: true } })
  if (!client) return null

  const lists = await prisma.crmList.findMany({ where: { userId }, select: { id: true, name: true } })
  const tagLists = lists.filter((l) => TAG_KEYS.has(normTag(l.name)))

  // Tira a cliente das etiquetas que não são a escolhida
  const target = tag ? tagLists.find((l) => normTag(l.name) === normTag(tag)) : undefined
  await prisma.crmListMember.deleteMany({
    where: {
      clientId,
      listId: { in: tagLists.filter((l) => l.id !== target?.id).map((l) => l.id) },
    },
  })

  if (tag && !target) {
    console.warn(`[client-tag] não existe lista do Kanban para a etiqueta "${tag}". Crie a lista com esse nome.`)
    return null
  }
  if (target) {
    await prisma.crmListMember.upsert({
      where: { listId_clientId: { listId: target.id, clientId } },
      create: { listId: target.id, clientId },
      update: {},
    })
    return target.name
  }
  return null
}
