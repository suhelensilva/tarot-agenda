// PDF do comparativo de períodos, desenhado direto com jsPDF (vetor: nítido em
// qualquer zoom). Uma página por métrica, no mesmo estilo da tela: frase
// principal, barras dos dois totais, gráfico e "de onde vem", resumo curto.

import {
  type CompareData, type Metric, type Grouping, type AlignedRow, type Breakdown,
  METRIC_LABELS, GROUPING_LABELS, LOWER_IS_BETTER,
  alignPeriods, metricStory, metricTotal, breakdown, rangeLabel, formatMetric,
  CLIENT_GROUPS, clientStory, revenueShare,
  pctChange, formatPct, trend, brl, num,
} from "@/lib/comparativo"

type RGB = [number, number, number]
const PURPLE: RGB = [124, 58, 237]
const PURPLE_DARK: RGB = [76, 29, 149]
const COLOR_A: RGB = [6, 182, 212] // ciano, igual à tela
const COLOR_B: RGB = [217, 70, 239] // magenta, igual à tela
const FUCHSIA: RGB = [192, 38, 211]
const GREEN: RGB = [5, 150, 105]
const GREEN_BG: RGB = [209, 250, 229]
const RED: RGB = [225, 29, 72]
const RED_BG: RGB = [255, 228, 230]
const INK: RGB = [17, 24, 39]
const MUTED: RGB = [107, 114, 128]
const LINE: RGB = [229, 231, 235]
const TRACK: RGB = [243, 244, 246]

const PAGE_W = 210
const PAGE_H = 297
const M = 14
const CONTENT_W = PAGE_W - M * 2
const BOTTOM = PAGE_H - 16

const ORDER: Metric[] = ["revenue", "expenses", "profit", "sessions"]

/** Fontes padrão do PDF não têm travessão, reticências nem espaço especial. */
const t = (s: string) => s.replace(/[—–−]/g, "-").replace(/…/g, "...").replace(/[  ]/g, " ")

type Opts = {
  data: CompareData
  nameA: string
  nameB: string
  grouping: Grouping
  chartType: "line" | "bar"
  /** O que estava aberto na tela vem primeiro. */
  first: Metric | "clients"
}

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

const shortMoney = (v: number) => {
  const s = v < 0 ? "-" : ""
  const n = Math.abs(v)
  return n >= 1000 ? `${s}R$${num(n / 1000, n >= 10000 ? 0 : 1)}k` : `${s}R$${num(n)}`
}

export async function downloadComparativoPdf({ data, nameA, nameB, grouping, chartType, first }: Opts) {
  const mod = await import("jspdf")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JsPDF: any = (mod as any).jsPDF ?? (mod as any).default ?? mod
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf: any = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  let y = 0
  const color = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2])
  const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2])
  const draw = (c: RGB) => pdf.setDrawColor(c[0], c[1], c[2])
  const font = (size: number, bold = false) => { pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size) }
  const text = (s: string, x: number, yy: number, opt?: object) => pdf.text(t(s), x, yy, opt)
  const fit = (s: string, w: number) => {
    let out = t(s)
    if (pdf.getTextWidth(out) <= w) return out
    while (out.length > 1 && pdf.getTextWidth(out + "...") > w) out = out.slice(0, -1)
    return out + "..."
  }
  const ensure = (h: number) => { if (y + h > BOTTOM) { pdf.addPage(); y = 16 } }

  const sectionTitle = (title: string) => {
    ensure(12)
    font(10.5, true); color(INK); text(title, M, y + 4)
    y += 8
  }

  const legend = (x: number, yy: number) => {
    font(8); let lx = x
    for (const [label, c] of [[nameA, COLOR_A], [nameB, COLOR_B]] as const) {
      fill(c as RGB); pdf.roundedRect(lx, yy - 2.6, 3.2, 3.2, 0.6, 0.6, "F")
      color(INK); const s = fit(label, 70); text(s, lx + 4.8, yy)
      lx += pdf.getTextWidth(s) + 12
    }
  }

  // ── Cabeçalho (página 1) ───────────────────────────────────────────────────
  // faixa em degradê violeta → magenta (fatias finas)
  const STEPS = 60
  for (let i = 0; i < STEPS; i++) {
    const k = i / (STEPS - 1)
    pdf.setFillColor(
      Math.round(PURPLE[0] + (FUCHSIA[0] - PURPLE[0]) * k),
      Math.round(PURPLE[1] + (FUCHSIA[1] - PURPLE[1]) * k),
      Math.round(PURPLE[2] + (FUCHSIA[2] - PURPLE[2]) * k),
    )
    pdf.rect((PAGE_W / STEPS) * i, 0, PAGE_W / STEPS + 0.3, 30, "F")
  }
  font(18, true); pdf.setTextColor(255, 255, 255)
  text("Comparativo de períodos", M, 14)
  font(9); pdf.setTextColor(233, 213, 255)
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  text(`Relatório financeiro · gerado em ${now}`, M, 21)
  y = 37

  const boxW = (CONTENT_W - 6) / 2
  ;([[nameA, data.a, COLOR_A], [nameB, data.b, COLOR_B]] as const).forEach(([name, p, c], i) => {
    const x = M + i * (boxW + 6)
    fill([250, 250, 252]); draw(LINE); pdf.setLineWidth(0.2)
    pdf.roundedRect(x, y, boxW, 15, 2, 2, "FD")
    fill(c as RGB); pdf.roundedRect(x + 3, y + 3.5, 8, 8, 1.5, 1.5, "F")
    font(9, true); pdf.setTextColor(255, 255, 255); text(i === 0 ? "A" : "B", x + 7, y + 8.9, { align: "center" })
    font(10.5, true); color(INK); text(fit(name, boxW - 18), x + 14, y + 7)
    font(8); color(MUTED); text(`${rangeLabel(p.from, p.to)} · ${p.days.length} dia${p.days.length > 1 ? "s" : ""}`, x + 14, y + 11.5)
  })
  y += 22

  const pages: (Metric | "clients")[] = [first, ...[...ORDER, "clients" as const].filter((m) => m !== first)]
  const rows = alignPeriods(data.a.days, data.b.days, grouping)

  pages.forEach((page, idx) => {
    if (idx > 0) { pdf.addPage(); y = 16 }
    if (page === "clients") { clientsPage(); return }
    const metric = page
    const story = metricStory(metric, data, nameA, nameB)
    const a = metricTotal(metric, data.a.summary), b = metricTotal(metric, data.b.summary)
    const diff = b - a
    const tr = trend(diff, LOWER_IS_BETTER[metric])

    // Faixa com o nome da métrica
    fill(PURPLE); pdf.roundedRect(M, y, CONTENT_W, 10, 2, 2, "F")
    font(12, true); pdf.setTextColor(255, 255, 255); text(METRIC_LABELS[metric], M + 5, y + 6.8)
    y += 16

    // Frase principal
    font(12.5, true); color(INK)
    const head: string[] = pdf.splitTextToSize(t(story.headline), CONTENT_W)
    head.forEach((l, i) => text(l, M, y + i * 6))
    y += head.length * 6 + 4

    // Barras dos dois totais
    const max = Math.max(Math.abs(a), Math.abs(b), 1)
    for (const [label, v, c] of [[nameA, a, COLOR_A], [nameB, b, COLOR_B]] as const) {
      font(9); color(MUTED); text(fit(label, 110), M, y + 3)
      font(12, true); color(INK); text(formatMetric(metric, v), M + CONTENT_W, y + 3.4, { align: "right" })
      y += 5.5
      fill(TRACK); pdf.roundedRect(M, y, CONTENT_W, 5, 2.5, 2.5, "F")
      const w = (Math.max(0, v) / max) * CONTENT_W
      if (w > 0.5) { fill(c as RGB); pdf.roundedRect(M, y, Math.max(w, 5), 5, 2.5, 2.5, "F") }
      y += 9
    }
    if (diff !== 0) {
      const badge = `${diff > 0 ? "+" : "-"}${formatMetric(metric, Math.abs(diff))}  ·  ${formatPct(pctChange(a, b))}`
      font(10, true)
      const bw = pdf.getTextWidth(t(badge)) + 8
      fill(tr === "good" ? GREEN_BG : tr === "bad" ? RED_BG : TRACK)
      pdf.roundedRect(M + CONTENT_W - bw, y - 2, bw, 7.5, 2, 2, "F")
      color(tr === "good" ? GREEN : tr === "bad" ? RED : MUTED)
      text(badge, M + CONTENT_W - 4, y + 3, { align: "right" })
      y += 9
    }
    y += 3

    // Gráfico principal
    sectionTitle(`${METRIC_LABELS[metric]} ${GROUPING_LABELS[grouping].toLowerCase()}`)
    legend(M, y + 1)
    y += 5
    drawChart(rows, metric)

    // De onde vem
    const bd = breakdown(metric, data)
    sectionTitle(bd.title)
    drawBreakdown(bd)

    summaryBox(story.lines)
  })

  function summaryBox(lines: string[]) {
    if (!lines.length) return
    const wrapped = lines.map((l) => pdf.splitTextToSize(t(l), CONTENT_W - 10) as string[])
    const h = wrapped.reduce((s, w) => s + w.length * 4.6 + 1.5, 0) + 12
    ensure(h)
    fill([245, 243, 255]); pdf.roundedRect(M, y, CONTENT_W, h, 2.5, 2.5, "F")
    font(9.5, true); color(PURPLE_DARK); text("Resumo", M + 5, y + 6.5)
    let yy = y + 12
    wrapped.forEach((w) => {
      fill(PURPLE); pdf.circle(M + 6, yy - 1.2, 0.8, "F")
      font(9); color(INK)
      w.forEach((l, i) => text(l, M + 9, yy + i * 4.6))
      yy += w.length * 4.6 + 1.5
    })
    y += h + 4
  }

  // ── Página "Clientes" ──────────────────────────────────────────────────────
  function clientsPage() {
    const A = data.a.clientMix, B = data.b.clientMix
    const story = clientStory(data, nameA, nameB)

    fill(PURPLE); pdf.roundedRect(M, y, CONTENT_W, 10, 2, 2, "F")
    font(12, true); pdf.setTextColor(255, 255, 255); text("Clientes", M + 5, y + 6.8)
    y += 16
    font(12.5, true); color(INK)
    const head: string[] = pdf.splitTextToSize(t(story.headline), CONTENT_W)
    head.forEach((l, i) => text(l, M, y + i * 6))
    y += head.length * 6 + 5

    // 3 cartões
    const cw = (CONTENT_W - 8) / 3
    CLIENT_GROUPS.forEach((g, i) => {
      const x = M + i * (cw + 4)
      const c = hex(g.color)
      fill([250, 250, 252]); draw(LINE); pdf.setLineWidth(0.2)
      pdf.roundedRect(x, y, cw, 34, 2.5, 2.5, "FD")
      fill(c); pdf.roundedRect(x, y, cw, 2.2, 1, 1, "F")
      font(9, true); color(c); text(g.label, x + 4, y + 8)
      font(20, true); color(INK); text(num(B[g.key].clients), x + 4, y + 19)
      font(7.5); color(MUTED); text(`antes: ${num(A[g.key].clients)}`, x + 4, y + 24)
      font(11, true); color(c); text(`${num(revenueShare(B, g.key))}%`, x + cw - 4, y + 19, { align: "right" })
      font(7); color(MUTED); text("da receita", x + cw - 4, y + 23.5, { align: "right" })
      text(`antes ${num(revenueShare(A, g.key))}%`, x + cw - 4, y + 27.5, { align: "right" })
    })
    y += 42

    // Barras 100%
    sectionTitle("De onde veio a receita")
    font(7.5); let lx = M
    for (const g of CLIENT_GROUPS) {
      fill(hex(g.color)); pdf.roundedRect(lx, y - 2.6, 3.2, 3.2, 0.6, 0.6, "F")
      color(INK); text(g.label, lx + 4.8, y); lx += pdf.getTextWidth(t(g.label)) + 12
    }
    y += 5
    for (const [mix, name, letter] of [[A, nameA, "A"], [B, nameB, "B"]] as const) {
      const total = mix.newOnce.revenue + mix.newRepeat.revenue + mix.recurring.revenue
      font(8.5, true); color(INK); text(`${letter}: ${fit(name, 120)}`, M, y + 3)
      font(8); color(MUTED); text(brl(total), M + CONTENT_W, y + 3, { align: "right" })
      y += 5
      fill(TRACK); pdf.roundedRect(M, y, CONTENT_W, 9, 2, 2, "F")
      let x = M
      if (total > 0) {
        for (const g of CLIENT_GROUPS) {
          const p = revenueShare(mix, g.key)
          if (p <= 0) continue
          const w = (p / 100) * CONTENT_W
          fill(hex(g.color)); pdf.rect(x, y, w, 9, "F")
          if (p >= 8) { font(8, true); pdf.setTextColor(255, 255, 255); text(`${num(p)}%`, x + w / 2, y + 5.8, { align: "center" }) }
          x += w
        }
      }
      y += 14
    }
    y += 2

    // Quantas clientes em cada grupo (barras horizontais A x B)
    sectionTitle("Quantas clientes em cada grupo")
    legend(M, y + 1); y += 6
    drawBreakdown({ title: "", kind: "count", items: CLIENT_GROUPS.map((g) => ({ name: g.label, a: A[g.key].clients, b: B[g.key].clients })) })

    summaryBox(story.lines)
  }

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  const total = pdf.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
    draw(LINE); pdf.setLineWidth(0.2); pdf.line(M, PAGE_H - 11, PAGE_W - M, PAGE_H - 11)
    font(7.5); color(MUTED)
    text(fit(`A: ${nameA}  ·  B: ${nameB}`, CONTENT_W - 30), M, PAGE_H - 6.5)
    text(`Página ${i} de ${total}`, PAGE_W - M, PAGE_H - 6.5, { align: "right" })
  }

  const digits = (s: string) => s.replace(/\D/g, "")
  pdf.save(`comparativo-${digits(data.a.from)}-${digits(data.b.from)}.pdf`)

  // ── Gráfico dia a dia (vetor) ──────────────────────────────────────────────
  function drawChart(rs: AlignedRow[], metric: Metric) {
    const H = 62
    ensure(H + 10)
    const left = M + 16, right = M + CONTENT_W - 1, top = y + 2, bottom = y + H
    const w = right - left, h = bottom - top

    const values = rs.flatMap((r) => [r.a?.[metric], r.b?.[metric]]).filter((v): v is number => v !== undefined)
    let max = Math.max(0, ...values), min = Math.min(0, ...values)
    if (max === min) max = min + 1
    const rawStep = (max - min) / 4
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
    let step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= rawStep) ?? rawStep
    if (metric === "sessions") step = Math.max(1, Math.ceil(step))
    max = Math.ceil(max / step) * step
    min = Math.floor(min / step) * step
    const yOf = (v: number) => bottom - ((v - min) / (max - min)) * h

    font(6.5); color(MUTED); pdf.setLineWidth(0.15)
    for (let v = min; v <= max + step / 2; v += step) {
      const yy = yOf(v)
      draw(v === 0 ? [190, 190, 200] : LINE); pdf.line(left, yy, right, yy)
      text(metric === "sessions" ? num(v) : shortMoney(v), left - 2, yy + 1.2, { align: "right" })
    }

    const n = Math.max(rs.length, 1)
    const slot = w / n
    const xOf = (i: number) => left + slot * i + slot / 2
    const every = Math.ceil(n / 16)
    rs.forEach((r, i) => {
      if (i % every !== 0 && i !== n - 1) return
      text(r.label.replace("Semana ", "Sem ").replace("Dia ", ""), xOf(i), bottom + 4, { align: "center" })
    })

    const series: ["a" | "b", RGB][] = [["a", COLOR_A], ["b", COLOR_B]]
    if (chartType === "line") {
      for (const [k, c] of series) {
        draw(c); pdf.setLineWidth(0.7)
        let prev: [number, number] | null = null
        rs.forEach((r, i) => {
          const v = r[k]?.[metric]
          if (v === undefined) { prev = null; return }
          const pt: [number, number] = [xOf(i), yOf(v)]
          if (prev) pdf.line(prev[0], prev[1], pt[0], pt[1])
          if (n <= 45) { fill(c); pdf.circle(pt[0], pt[1], 0.6, "F") }
          prev = pt
        })
      }
    } else {
      const bw = Math.min(6, slot * 0.36)
      rs.forEach((r, i) => {
        series.forEach(([k, c], si) => {
          const v = r[k]?.[metric]
          if (v === undefined || v === 0) return
          const x = xOf(i) + (si === 0 ? -bw - 0.25 : 0.25)
          const y0 = yOf(0), y1 = yOf(v)
          fill(c); pdf.rect(x, Math.min(y0, y1), bw, Math.max(0.3, Math.abs(y1 - y0)), "F")
        })
      })
    }
    y = bottom + 10
  }

  // ── Barras horizontais "de onde vem" ───────────────────────────────────────
  function drawBreakdown(bd: Breakdown) {
    const fmt = (v: number) => (bd.kind === "count" ? num(v) : brl(v))
    if (bd.items.every((i) => i.a === 0 && i.b === 0)) {
      ensure(10); font(9); color(MUTED); text("Nada registrado nos dois períodos.", M, y + 3); y += 10; return
    }
    const labelW = 48, valueW = 26
    const barX = M + labelW, barW = CONTENT_W - labelW - valueW
    const max = Math.max(1, ...bd.items.flatMap((i) => [Math.abs(i.a), Math.abs(i.b)]))
    for (const it of bd.items) {
      ensure(13)
      font(8.5); color(INK); text(fit(it.name, labelW - 3), M, y + 4.8)
      for (const [v, c, dy] of [[it.a, COLOR_A, 0], [it.b, COLOR_B, 5]] as const) {
        const w = (Math.max(0, v) / max) * barW
        fill(TRACK); pdf.roundedRect(barX, y + dy, barW, 3.8, 1.2, 1.2, "F")
        if (w > 0.3) { fill(c as RGB); pdf.roundedRect(barX, y + dy, Math.max(w, 2.4), 3.8, 1.2, 1.2, "F") }
        font(7.5); color(MUTED); text(fmt(v), M + CONTENT_W, y + dy + 3.1, { align: "right" })
      }
      y += 13
    }
    y += 3
  }
}
