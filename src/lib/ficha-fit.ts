// Estima, no servidor, a altura que a Ficha Interna ocupa na folha A4
// (mesmo layout de components/ficha-preview.tsx → FichaInternaPreview).
// Usado ao criar um agendamento: se o novo atendimento não couber INTEIRO na folha
// da ficha atual, ele vai para uma ficha nova (com os dados da cliente repetidos).
//
// É uma estimativa conservadora (conta letras por linha); se mudar o layout da ficha,
// ajustar os números aqui também.

type Person = { name?: string | null; birthDate?: string | null; notes?: string | null }
type Card = { card?: string | null; interpretation?: string | null }
type Link = { url?: string | null }

export type FichaFitData = {
  serviceId?: string | null
  productName?: string | null
  returnSchedule?: string | null
  mainSubject?: string | null
  involvedPeople?: unknown
  sessionCards?: unknown
  topicsAddressed?: string | null
  clientQuestions?: string | null
  energeticObservations?: string | null
  therapeuticSuggestions?: string | null
  links?: unknown
}

const A4_H = 1123
const PADDING = 48
// folga de segurança: a estimativa nunca deve dizer "cabe" quando não cabe
export const FICHA_PAGE_LIMIT = (A4_H - PADDING * 2) * 0.95

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

// quantas linhas um texto ocupa numa largura de ~698px
function wrap(text: string, charsPerLine: number) {
  return text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / charsPerLine)), 0)
}

const TEXT_LINE = 27 // 15px × 1.8
const TEXT_CHARS = 88
const SECTION_HEAD = 51 // divisória + título
const SECTION_END = 22

function textSection(text: string | null | undefined) {
  if (!text) return 0
  return SECTION_HEAD + wrap(text, TEXT_CHARS) * TEXT_LINE + SECTION_END
}

const ENTRY_DATE = /^\[(\d{2}\/\d{2}\/\d{4})\]\s*/

function sessionSection(text: string | null | undefined) {
  if (!text) return 0
  const entries: string[][] = []
  for (const line of text.split("\n")) {
    const m = line.match(ENTRY_DATE)
    if (m || entries.length === 0) entries.push([])
    const rest = m ? line.slice(m[0].length) : line
    if (rest.trim()) entries[entries.length - 1].push(rest)
  }
  let h = SECTION_HEAD
  entries.forEach((lines, i) => {
    h += 32 + (i > 0 ? 25 : 0) // etiqueta "Atendimento N" (+ tracejado entre atendimentos)
    h += lines.reduce((n, l) => n + wrap(l, TEXT_CHARS), 0) * TEXT_LINE
  })
  return h + SECTION_END
}

export function estimateFichaHeight(f: FichaFitData, clientName = "") {
  let h = 104 + 26 + (clientName.length > 28 ? 98 : 52) + 44 // logo, linha, nome, nascimento

  if (f.serviceId || f.productName) h += 83
  if (f.returnSchedule) h += wrap(f.returnSchedule, 70) * 24 + 18
  if (f.mainSubject) h += wrap(f.mainSubject, 70) * 24 + 18

  const people = arr<Person>(f.involvedPeople).filter((p) => p?.name)
  if (people.length) {
    h += 53
    for (const p of people) h += 20 + 27 + (p.birthDate ? 24 : 0) + (p.notes ? wrap(p.notes, 85) * 23 : 0) + 22
  }

  const cards = arr<Card>(f.sessionCards).filter((c) => c?.card)
  if (cards.length) {
    h += 53
    for (const c of cards) h += wrap(`${c.card} → ${c.interpretation ?? ""}`, TEXT_CHARS) * 23 + 22
  }

  h += textSection(f.topicsAddressed)
  h += sessionSection(f.clientQuestions)
  h += textSection(f.energeticObservations)
  h += textSection(f.therapeuticSuggestions)

  const links = arr<Link>(f.links).filter((l) => l?.url)
  if (links.length) h += 53 + links.length * 30

  return h
}

export function fitsOnePage(f: FichaFitData, clientName = "") {
  return estimateFichaHeight(f, clientName) <= FICHA_PAGE_LIMIT
}
