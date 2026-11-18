// As perguntas de cada atendimento ficam na ficha interna da cliente, no campo
// clientQuestions, uma entrada por atendimento no formato "[dd/mm/aaaa] texto".
// Uma entrada pode ter várias linhas: vai até a próxima linha que começa com data.

const ENTRY_START = /^\[\d{2}\/\d{2}\/\d{4}\] ?/

export function dateLabelBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" })
}

export function splitEntries(text: string | null | undefined): string[] {
  if (!text) return []
  const entries: string[] = []
  for (const line of text.split("\n")) {
    if (ENTRY_START.test(line) || entries.length === 0) entries.push(line)
    else entries[entries.length - 1] += "\n" + line
  }
  return entries
}

/** Índice da entrada daquele dia, ou -1. */
export function findEntry(entries: string[], label: string) {
  return entries.findIndex((e) => e.startsWith(`[${label}]`))
}

/** Texto da entrada sem a data na frente. */
export function entryText(entry: string) {
  return entry.replace(ENTRY_START, "")
}
