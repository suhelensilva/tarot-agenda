/** Sem acento e minúsculo, para comparar nomes ("Jéssica" vira "jessica"). */
export function normName(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim()
}

/**
 * Cada palavra digitada precisa ser o começo de alguma palavra do nome, em qualquer ordem,
 * com ou sem acento. "su" acha "Suelen"; "mariana" acha "Suelen Mariana"; "jessica" acha "Jéssica".
 */
export function matchesName(name: string, query: string) {
  const words = normName(name).split(/\s+/)
  return normName(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((q) => words.some((w) => w.startsWith(q)))
}

/** Busca por nome (regra acima) ou por telefone (só os dígitos). */
export function matchesClient(c: { name: string; phone?: string | null }, query: string) {
  if (!query.trim()) return true
  if (matchesName(c.name, query)) return true
  const digits = query.replace(/\D/g, "")
  return digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits)
}
