"use client"

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react"
import { Download, Pencil, X } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"

// ─── Tipos compartilhados ─────────────────────────────────────────────────────

export type FichaProfile = {
  logoUrl: string | null
  reportBg: string | null
  signature?: string | null
  slogan?: string | null
  // Fonte + cor do título (nome da cliente + cabeçalho "Relatório de Atendimento")
  reportTitleFont?: string | null
  reportTitleColor?: string | null
  // Fonte + cor da assinatura/marca (rodapé "Com Carinho + nome da terapeuta")
  reportSignatureFont?: string | null
  reportSignatureColor?: string | null
  // Fonte + cor do corpo (subtítulos das perguntas, parágrafos)
  reportFont?: string | null
  reportTextColor?: string | null
  // Cor de destaque (seções, divisórias)
  reportAccentColor?: string | null
}
export type FichaClientData = { id: string; name: string; birthDate: string | null }
export type FichaServiceData = { id: string; name: string; price: number }

export type FichaPreviewData = {
  type: "INTERNAL" | "REPORT"
  mainSubject?: string | null
  productName?: string | null
  serviceId?: string | null
  mainComplaint?: string | null
  complaintText?: string | null
  sessionCards?: Array<{ card: string; interpretation?: string | null }>
  topicsAddressed?: string | null
  clientQuestions?: string | null
  energeticObservations?: string | null
  therapeuticSuggestions?: string | null
  returnSchedule?: string | null
  involvedPeople?: Array<{ name: string; birthDate?: string | null; relation?: string | null; notes?: string | null }>
  questions?: Array<{ question: string; cards?: string | null; interpretation?: string | null }>
  energeticTips?: string | null
  spiritualPractice?: string | null
  additionalServices?: string | null
  links?: Array<{ label: string; url: string }>
}

// ─── Paginação A4 ─────────────────────────────────────────────────────────────

const A4_W = 794
const A4_H = 1123
const PAGE_GAP = 16

type PageBlock = { key: string; node: ReactNode; keepWithNext?: boolean }

const splitLines = (text: string) => text.split("\n")

// Mede cada bloco escondido e distribui em folhas; o que não cabe vai inteiro para a próxima.
function PagedA4({
  blocks, footer, padding, fontFamily, background, pageStyle, scale, divRef,
}: {
  blocks: PageBlock[]
  footer?: ReactNode
  padding: number
  fontFamily: string
  background?: ReactNode
  pageStyle?: CSSProperties
  scale: number
  divRef?: RefObject<HTMLDivElement | null>
}) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<number[][] | null>(null)

  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const kids = Array.from(el.children) as HTMLElement[]
    const hs = blocks.map((_, i) => kids[i]?.offsetHeight ?? 0)
    const footerH = footer ? kids[blocks.length]?.offsetHeight ?? 0 : 0
    const avail = A4_H - padding * 2
    const result: number[][] = [[]]
    let used = 0
    for (let i = 0; i < blocks.length; i++) {
      let need = hs[i]
      for (let j = i; blocks[j]?.keepWithNext && j + 1 < blocks.length; j++) need += hs[j + 1]
      if (used + need > avail && result[result.length - 1].length > 0) {
        result.push([])
        used = 0
      }
      result[result.length - 1].push(i)
      used += hs[i]
    }
    if (footer && used + footerH > avail) result.push([])
    const next = JSON.stringify(result)
    setPages((prev) => (JSON.stringify(prev) === next ? prev : result))
  })

  // A divisão em folhas é calculada DEPOIS de desenhar. Se um bloco sumiu no meio-tempo
  // (ex.: apagou o nome da pessoa envolvida), a divisão antiga aponta para blocos que não
  // existem mais e a tela quebrava. Só usa a divisão se ela tiver exatamente os blocos atuais.
  const valid = pages && pages.flat().length === blocks.length && pages.every((p) => p.every((i) => i < blocks.length))
  const pageList = valid ? pages : [blocks.map((_, i) => i)]
  const totalH = pageList.length * A4_H + (pageList.length - 1) * PAGE_GAP

  return (
    <div style={{ width: A4_W * scale, height: totalH * scale, position: "relative", overflow: "hidden" }}>
      <div ref={divRef} style={{
        width: A4_W, transform: `scale(${scale})`, transformOrigin: "top left",
        display: "flex", flexDirection: "column", gap: PAGE_GAP,
      }}>
        {pageList.map((idxs, p) => (
          <div key={p} data-ficha-page="" style={{
            width: A4_W, height: A4_H, flexShrink: 0, position: "relative", overflow: "hidden",
            backgroundColor: "#fff", fontFamily,
            boxShadow: scale < 1 ? "0 1px 6px rgba(0,0,0,0.15)" : undefined,
            ...pageStyle,
          }}>
            {background}
            <div style={{
              position: "relative", zIndex: 1, padding, height: "100%", boxSizing: "border-box",
              display: "flex", flexDirection: "column",
            }}>
              {idxs.map((i) => (
                <div key={blocks[i].key} style={{ display: "flow-root", flexShrink: 0 }}>{blocks[i].node}</div>
              ))}
              {footer && p === pageList.length - 1 && (
                <>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flow-root", flexShrink: 0 }}>{footer}</div>
                </>
              )}
            </div>
            {pageList.length > 1 && (
              <span style={{ position: "absolute", bottom: 16, right: 24, zIndex: 1, fontSize: 11, color: "#9ca3af" }}>
                {p + 1}/{pageList.length}
              </span>
            )}
          </div>
        ))}
      </div>

      <div ref={measureRef} aria-hidden style={{
        position: "absolute", left: 0, top: 0, width: A4_W - padding * 2,
        visibility: "hidden", pointerEvents: "none", fontFamily,
      }}>
        {blocks.map((b) => <div key={b.key} style={{ display: "flow-root" }}>{b.node}</div>)}
        {footer && <div style={{ display: "flow-root" }}>{footer}</div>}
      </div>
    </div>
  )
}

// Gera o PDF capturando cada folha separadamente (nada é cortado no meio).
export async function downloadFichaPdf(root: HTMLElement, filename: string) {
  const html2canvas = (await import("html2canvas")).default
  const jspdfMod = await import("jspdf")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JsPDF: any = (jspdfMod as any).jsPDF ?? (jspdfMod as any).default ?? jspdfMod
  const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ps = pdf.internal.pageSize as any
  const pageWidth: number = ps.getWidth?.() ?? ps.width ?? 210
  const pageHeight: number = ps.getHeight?.() ?? ps.height ?? 297

  const pageEls = Array.from(root.querySelectorAll<HTMLElement>("[data-ficha-page]"))
  if (pageEls.length === 0) throw new Error("Nenhuma folha encontrada para gerar o PDF.")

  for (let i = 0; i < pageEls.length; i++) {
    const canvas = await html2canvas(pageEls[i], {
      scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff",
      logging: false, scrollX: 0, scrollY: 0,
    })
    if (canvas.width === 0 || canvas.height === 0) throw new Error("Canvas gerado está vazio. Tente novamente.")
    if (i > 0) pdf.addPage()
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWidth, pageHeight)
  }
  pdf.save(filename)
}

// ─── Ficha Interna A4 ─────────────────────────────────────────────────────────

const FI_DIVIDER = <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 16px" }} />
const FI_TITLE: CSSProperties = { fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 10px" }
const FI_TEXT: CSSProperties = { fontSize: 15, color: "#4b5563", margin: 0, whiteSpace: "pre-line", lineHeight: 1.8 }

function fiTextSection(key: string, title: string, text: string | null | undefined): PageBlock[] {
  if (!text) return []
  const lines = splitLines(text)
  return [
    { key: `${key}-h`, keepWithNext: true, node: <>{FI_DIVIDER}<p style={FI_TITLE}>{title}</p></> },
    ...lines.map((l, i) => ({
      key: `${key}-${i}`,
      node: <p style={{ ...FI_TEXT, paddingBottom: i === lines.length - 1 ? 22 : 0 }}>{l || " "}</p>,
    })),
  ]
}

const ENTRY_DATE = /^\[(\d{2}\/\d{2}\/\d{4})\]\s*/

// Cada agendamento grava "[dd/mm/aaaa] texto"; separa em blocos "Atendimento N".
function fiSessionSection(key: string, title: string, text: string | null | undefined): PageBlock[] {
  if (!text) return []
  const entries: { date: string | null; lines: string[] }[] = []
  for (const line of splitLines(text)) {
    const m = line.match(ENTRY_DATE)
    if (m || entries.length === 0) entries.push({ date: m?.[1] ?? null, lines: [] })
    const rest = m ? line.slice(m[0].length) : line
    if (rest.trim()) entries[entries.length - 1].lines.push(rest)
  }
  const blocks: PageBlock[] = [
    { key: `${key}-h`, keepWithNext: true, node: <>{FI_DIVIDER}<p style={FI_TITLE}>{title}</p></> },
  ]
  entries.forEach((e, ei) => {
    blocks.push({
      key: `${key}-${ei}-h`, keepWithNext: e.lines.length > 0,
      node: (
        <div style={{ paddingTop: ei === 0 ? 0 : 12 }}>
          {ei > 0 && <div style={{ borderTop: "1px dashed #c4b5fd", margin: "0 0 12px" }} />}
          <span style={{ display: "inline-block", background: "#ede9fe", color: "#6d28d9", fontSize: 13, fontWeight: 700, borderRadius: 999, padding: "3px 12px", marginBottom: 6 }}>
            Atendimento {ei + 1}{e.date ? ` · ${e.date}` : ""}
          </span>
        </div>
      ),
    })
    // keepWithNext em todas as linhas menos a última: o atendimento vai inteiro para a folha
    e.lines.forEach((l, li) => blocks.push({ key: `${key}-${ei}-${li}`, keepWithNext: li < e.lines.length - 1, node: <p style={FI_TEXT}>{l}</p> }))
  })
  const last = blocks[blocks.length - 1]
  last.node = <div style={{ paddingBottom: 22 }}>{last.node}</div>
  return blocks
}

export function FichaInternaPreview({
  data, client, service, profile, scale = 1, divRef,
}: {
  data: FichaPreviewData
  client: FichaClientData | undefined
  service: FichaServiceData | undefined
  profile: FichaProfile
  scale?: number
  divRef?: RefObject<HTMLDivElement | null>
}) {
  const today = new Date().toLocaleDateString("pt-BR")
  const cards = (data.sessionCards ?? []).filter((c) => c.card)
  const people = (data.involvedPeople ?? []).filter((p) => p.name)
  const links = (data.links ?? []).filter((l) => l.url)

  const blocks: PageBlock[] = [
    {
      key: "header",
      node: (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ width: 80, height: 80, flexShrink: 0 }}>
              {profile.logoUrl
                ? <img src={profile.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <div style={{ width: "100%", height: "100%", border: "1.5px dashed #d1d5db", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, color: "#9ca3af", textAlign: "center" }}>Sem logo</span>
                  </div>
              }
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: "#6d28d9", letterSpacing: 0.5, margin: 0, textTransform: "uppercase" }}>Ficha Interna</p>
              <p style={{ fontSize: 14, color: "#9ca3af", margin: "6px 0 0" }}>Data: {today}</p>
            </div>
          </div>
          <div style={{ borderTop: "2px solid #7c3aed", marginBottom: 24, opacity: 0.25 }} />
          <p style={{ fontSize: 40, fontWeight: 800, color: "#111827", margin: "0 0 6px", lineHeight: 1.15 }}>
            {client?.name || <span style={{ color: "#d1d5db" }}>Nome da cliente</span>}
          </p>
          {client?.birthDate && (
            <p style={{ fontSize: 16, color: "#6b7280", margin: "0 0 20px" }}>Data de Nascimento: {formatDate(client.birthDate)}</p>
          )}
        </>
      ),
    },
  ]

  if (service || data.productName) {
    blocks.push({
      key: "pacote",
      node: (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f5f3ff", borderRadius: 8, padding: "12px 16px", marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Pacote recomendado</span>
            <p style={{ fontSize: 17, fontWeight: 600, color: "#5b21b6", margin: "3px 0 0" }}>{service?.name || data.productName}</p>
          </div>
        </div>
      ),
    })
  }

  if (data.returnSchedule) {
    blocks.push({
      key: "retorno",
      node: (
        <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 18 }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Horários disponíveis para retorno: </span>
          {data.returnSchedule}
        </p>
      ),
    })
  }

  if (data.mainSubject) {
    blocks.push({
      key: "foco",
      node: (
        <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 18 }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>Foco da sessão: </span>
          {data.mainSubject}
        </p>
      ),
    })
  }

  if (people.length > 0) {
    blocks.push({ key: "pessoas-h", keepWithNext: true, node: <>{FI_DIVIDER}<p style={{ ...FI_TITLE, margin: "0 0 12px" }}>👥 Pessoas envolvidas:</p></> })
    people.forEach((p, i) => blocks.push({
      key: `pessoa-${i}`,
      node: (
        <div style={{ paddingBottom: i === people.length - 1 ? 22 : 10 }}>
          <div style={{ background: "#f5f3ff", borderRadius: 6, padding: "10px 14px" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 3px" }}>
              {p.name}
              {p.relation && <span style={{ fontWeight: 400, color: "#6b7280" }}> · {p.relation}</span>}
            </p>
            {p.birthDate && (
              <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 3px" }}>Nascimento: {formatDate(p.birthDate)}</p>
            )}
            {p.notes && (
              <p style={{ fontSize: 14, color: "#4b5563", margin: 0, whiteSpace: "pre-line", lineHeight: 1.6 }}>{p.notes}</p>
            )}
          </div>
        </div>
      ),
    }))
  }

  if (cards.length > 0) {
    blocks.push({ key: "cartas-h", keepWithNext: true, node: <>{FI_DIVIDER}<p style={{ ...FI_TITLE, margin: "0 0 12px" }}>🃏 Cartas da sessão:</p></> })
    cards.forEach((c, i) => blocks.push({
      key: `carta-${i}`,
      node: (
        <p style={{ fontSize: 15, margin: 0, paddingBottom: i === cards.length - 1 ? 22 : 10 }}>
          <span style={{ fontWeight: 700, color: "#111827" }}>{c.card}</span>
          {c.interpretation && <span style={{ color: "#4b5563" }}> → {c.interpretation}</span>}
        </p>
      ),
    }))
  }

  blocks.push(...fiTextSection("temas", "🔮 Temas principais abordados:", data.topicsAddressed))
  blocks.push(...fiSessionSection("perguntas", "❓ Perguntas da cliente:", data.clientQuestions))
  blocks.push(...fiTextSection("energetico", "💓 Observações energéticas:", data.energeticObservations))
  blocks.push(...fiTextSection("sugestao", "✨ Sugestão terapêutica para alinhamento:", data.therapeuticSuggestions))

  if (links.length > 0) {
    blocks.push({ key: "links-h", keepWithNext: true, node: <>{FI_DIVIDER}<p style={{ ...FI_TITLE, margin: "0 0 12px" }}>🔗 Links úteis:</p></> })
    links.forEach((l, i) => blocks.push({
      key: `link-${i}`,
      node: (
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: i === links.length - 1 ? 22 : 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed", flexShrink: 0, display: "inline-block" }} />
          <span style={{ fontSize: 15, color: "#374151", fontWeight: 600, minWidth: 90 }}>{l.label || "Link"}</span>
          <a href={l.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 14, color: "#7c3aed", textDecoration: "underline", wordBreak: "break-all" }}>
            {l.url}
          </a>
        </div>
      ),
    }))
  }

  return (
    <PagedA4
      blocks={blocks}
      padding={48}
      fontFamily="'Segoe UI', Arial, sans-serif"
      scale={scale}
      divRef={divRef}
      background={profile.reportBg
        ? <img src={profile.reportBg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        : undefined}
    />
  )
}

// ─── Relatório A4 ─────────────────────────────────────────────────────────────

export function RelatorioPreview({
  data, client, service, profile, scale = 1, divRef,
}: {
  data: FichaPreviewData
  client: FichaClientData | undefined
  service: FichaServiceData | undefined
  profile: FichaProfile
  scale?: number
  divRef?: RefObject<HTMLDivElement | null>
}) {
  const titleFont = profile.reportTitleFont || "Georgia, serif"
  const titleColor = profile.reportTitleColor || "#4a1d96"
  const signatureFont = profile.reportSignatureFont || "Georgia, serif"
  const signatureColor = profile.reportSignatureColor || (profile.reportAccentColor || "#7c3aed")
  const bodyFont = profile.reportFont || "Georgia, serif"
  const textColor = profile.reportTextColor || "#374151"
  const accentColor = profile.reportAccentColor || "#7c3aed"
  const therapistName = profile.signature || "Sua Terapeuta"
  const today = new Date().toLocaleDateString("pt-BR")
  const people = (data.involvedPeople ?? []).filter((p) => p.name)
  const questions = (data.questions ?? []).filter((q) => q.question)
  const links = (data.links ?? []).filter((l) => l.url)

  const bodyText: CSSProperties = { fontSize: 13, color: textColor, fontFamily: bodyFont, lineHeight: 1.7, whiteSpace: "pre-line", margin: 0 }
  const sectionTitle: CSSProperties = { fontSize: 14, fontWeight: 700, fontStyle: "italic", color: accentColor, fontFamily: bodyFont, margin: "0 0 6px" }

  const textSection = (key: string, title: string, text: string | null | undefined): PageBlock[] => {
    if (!text) return []
    return [
      {
        key: `${key}-h`, keepWithNext: true,
        node: <div style={{ paddingTop: 16 }}><p style={sectionTitle}>{title}</p><div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 8px" }} /></div>,
      },
      ...splitLines(text).map((l, i) => ({ key: `${key}-${i}`, node: <p style={bodyText}>{l || " "}</p> })),
    ]
  }

  const blocks: PageBlock[] = [
    {
      key: "header",
      node: (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 0 }}>
            <div style={{ width: 72, height: 72, flexShrink: 0 }}>
              {profile.logoUrl
                ? <img src={profile.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <div style={{ width: "100%", height: "100%", border: "1.5px dashed #d1d5db", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 8, color: "#9ca3af", textAlign: "center" }}>Sem logo</span>
                  </div>
              }
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 24, fontFamily: titleFont, fontStyle: "italic", color: accentColor, margin: 0 }}>
                Relatório de Atendimento
              </p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>Data: {today}</p>
            </div>
          </div>
          <div style={{ borderTop: `2px solid ${accentColor}`, opacity: 0.4, margin: "14px 0" }} />
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            {profile.slogan && (
              <p style={{ fontSize: 13, fontStyle: "italic", color: textColor, margin: "0 0 8px" }}>
                {profile.slogan}
              </p>
            )}
            <p style={{ fontSize: 32, fontWeight: 800, color: titleColor, margin: 0, fontFamily: titleFont, fontStyle: "italic" }}>
              {client?.name || <span style={{ color: "#d1d5db" }}>Nome da cliente</span>}
            </p>
            {(service || data.productName) && (
              <span style={{
                background: "#f5f3ff", borderRadius: 20, padding: "3px 14px",
                fontSize: 12, color: accentColor, display: "inline-block", marginTop: 6,
              }}>
                {service?.name || data.productName}
              </span>
            )}
          </div>
          <div style={{ borderTop: `2px solid ${accentColor}`, opacity: 0.4, margin: "14px 0" }} />
        </>
      ),
    },
  ]

  if (people.length > 0) {
    blocks.push({
      key: "pessoas-h", keepWithNext: true,
      node: <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", color: accentColor, fontFamily: bodyFont, margin: "0 0 8px" }}>👥 Pessoas envolvidas</p>,
    })
    people.forEach((p, i) => blocks.push({
      key: `pessoa-${i}`,
      node: (
        <div style={{ paddingBottom: i === people.length - 1 ? 14 : 6 }}>
          <div style={{ background: "#f5f3ff", borderRadius: 6, padding: "7px 12px" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: titleColor, fontFamily: bodyFont, margin: "0 0 2px" }}>
              {p.name}
              {p.relation && <span style={{ fontWeight: 400, color: "#6b7280" }}> · {p.relation}</span>}
            </p>
            {p.birthDate && (
              <p style={{ fontSize: 12, color: "#6b7280", fontFamily: bodyFont, margin: "0 0 2px" }}>Nascimento: {formatDate(p.birthDate)}</p>
            )}
            {p.notes && (
              <p style={{ fontSize: 12, color: textColor, fontFamily: bodyFont, margin: 0, whiteSpace: "pre-line", lineHeight: 1.6 }}>{p.notes}</p>
            )}
          </div>
        </div>
      ),
    }))
  }

  questions.forEach((q, qi) => {
    const interp = q.interpretation ? splitLines(q.interpretation) : []
    blocks.push({
      key: `q-${qi}-h`, keepWithNext: true,
      node: (
        <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", color: accentColor, fontFamily: bodyFont, margin: "0 0 4px" }}>
          🌙 {q.question}
        </p>
      ),
    })
    if (q.cards) {
      blocks.push({
        key: `q-${qi}-c`, keepWithNext: interp.length > 0,
        node: (
          <p style={{ fontSize: 13, color: textColor, fontFamily: bodyFont, margin: "0 0 6px", fontWeight: 600, paddingBottom: interp.length ? 0 : 14 }}>
            Cartas: {q.cards}
          </p>
        ),
      })
    }
    interp.forEach((l, li) => blocks.push({
      key: `q-${qi}-${li}`,
      node: (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingBottom: li === interp.length - 1 ? 14 : 0 }}>
          <span style={{ color: accentColor, fontSize: 16, lineHeight: 1, visibility: li === 0 ? "visible" : "hidden" }}>•</span>
          <span style={{ fontSize: 13, color: textColor, fontFamily: bodyFont, lineHeight: 1.7, flex: 1, whiteSpace: "pre-line" }}>
            {l || " "}
          </span>
        </div>
      ),
    }))
    if (!q.cards && interp.length === 0) blocks[blocks.length - 1].node = <div style={{ paddingBottom: 14 }}>{blocks[blocks.length - 1].node}</div>
  })

  blocks.push(...textSection("dicas", "🔮 Conselhos / Dicas Energéticas", data.energeticTips))
  blocks.push(...textSection("pratica", "🌸 Prática para a Espiritualidade", data.spiritualPractice))
  blocks.push(...textSection("servicos", "✨ Rituais e Serviços Adicionais", data.additionalServices))

  if (links.length > 0) {
    blocks.push({
      key: "links-h", keepWithNext: true,
      node: (
        <div style={{ paddingTop: 16 }}>
          <p style={sectionTitle}>🔗 Links úteis</p>
          <div style={{ borderTop: `1px solid ${accentColor}`, opacity: 0.3, margin: "0 0 10px" }} />
        </div>
      ),
    })
    links.forEach((l, i) => blocks.push({
      key: `link-${i}`,
      node: (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingBottom: 7 }}>
          <span style={{ fontSize: 15, lineHeight: 1.3, color: accentColor }}>•</span>
          <div>
            {l.label && (
              <span style={{ fontSize: 13, fontWeight: 700, color: textColor, fontFamily: bodyFont, marginRight: 6 }}>
                {l.label}:
              </span>
            )}
            <a href={l.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: accentColor, textDecoration: "underline", wordBreak: "break-all", fontFamily: bodyFont }}>
              {l.url}
            </a>
          </div>
        </div>
      ),
    }))
  }

  const signature = (
    <div style={{ paddingTop: 24, paddingBottom: 8, textAlign: "center" }}>
      <div style={{ borderTop: `1px solid ${accentColor}`, opacity: 0.2, marginBottom: 20 }} />
      <span style={{ fontSize: 15, fontStyle: "italic", fontFamily: signatureFont, color: signatureColor, display: "block" }}>
        Com Carinho
      </span>
      <span style={{ fontSize: 19, fontStyle: "italic", fontFamily: signatureFont, fontWeight: 700, color: signatureColor, display: "block", marginTop: 4 }}>
        {therapistName}
      </span>
    </div>
  )

  return (
    <PagedA4
      blocks={blocks}
      footer={signature}
      padding={48}
      fontFamily="'Segoe UI', Arial, sans-serif"
      scale={scale}
      divRef={divRef}
      pageStyle={profile.reportBg ? {
        backgroundImage: `url(${profile.reportBg})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center top",
      } : undefined}
    />
  )
}

// ─── Modal de visualização ────────────────────────────────────────────────────

export function FichaPreviewModal({
  data, client, service, profile, onClose, onDownload, onEdit,
}: {
  data: FichaPreviewData
  client: FichaClientData | undefined
  service: FichaServiceData | undefined
  profile: FichaProfile
  onClose: () => void
  onDownload: () => void
  onEdit?: () => void
}) {
  const isInternal = data.type === "INTERNAL"
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">
            {isInternal ? "Ficha Interna" : "Relatório"} — {client?.name ?? "visualização"}
          </p>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Pencil size={13} /> Editar
              </button>
            )}
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={13} /> Baixar PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-auto p-4">
          {isInternal
            ? <FichaInternaPreview data={data} client={client} service={service} profile={profile} scale={0.8} />
            : <RelatorioPreview data={data} client={client} service={service} profile={profile} scale={0.8} />
          }
        </div>
      </div>
    </div>
  )
}
