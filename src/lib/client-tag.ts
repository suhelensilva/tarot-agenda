import { prisma } from "@/lib/prisma"

// Lista interna do Kanban (cliente bloqueada). Não é etiqueta, então fica de fora.
export const BLACKLIST_NAME = "__blacklist__"

// Casamento por nome ignora acento, maiúsculas, espaço, hífen e "s" final:
// "Paga-pouco" casa com "PAGA POUCO", "Compradora" casa com "COMPRADORAS".
export function normTag(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/S$/, "")
}

/**
 * A etiqueta de uma cliente é a lista (CrmListMember) em que ela está.
 * Use TAG_MEMBERSHIP_INCLUDE no include do Prisma e withTag() na resposta.
 */
export const TAG_MEMBERSHIP_INCLUDE = {
  listMemberships: {
    where: { list: { name: { not: BLACKLIST_NAME } } },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { list: { select: { name: true } } },
  },
}

export function withTag<T extends { listMemberships?: { list: { name: string } }[] }>(c: T) {
  const { listMemberships, ...rest } = c
  return { ...rest, tag: listMemberships?.[0]?.list.name ?? null }
}

/**
 * Valida antes de salvar: a etiqueta escolhida precisa existir como lista do Kanban.
 * Retorna a mensagem de erro, ou null se estiver tudo certo.
 * Assim a cliente nunca fica com etiqueta sem estar em uma lista.
 */
export async function tagListError(userId: string, tag: string | null | undefined): Promise<string | null> {
  if (!tag) return null
  const lists = await prisma.crmList.findMany({ where: { userId }, select: { name: true } })
  const exists = lists.some((l) => l.name !== BLACKLIST_NAME && normTag(l.name) === normTag(tag))
  return exists ? null : `A etiqueta "${tag}" não existe no Kanban. Crie a lista "${tag}" primeiro.`
}

/**
 * Única forma de gravar a etiqueta da cliente.
 * A etiqueta é uma lista do Kanban (CrmListMember). Escolher uma coloca a cliente
 * nela e tira das outras etiquetas (uma etiqueta por cliente).
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
  const tagLists = lists.filter((l) => l.name !== BLACKLIST_NAME)

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
