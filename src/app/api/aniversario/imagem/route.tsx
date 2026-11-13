import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

// Imagem de aniversário personalizada: arte base (public/aniversario-base.jpg, 1333x2000)
// + primeiro nome da cliente escrito na fonte Allura no espaço abaixo de "Parabéns".
// Rota pública (sem login) para o WhatsApp/Evolution conseguir baixar a imagem depois.

const W = 1333
const H = 2000
// Medidas tiradas da arte modelo com "Victória": texto de x=376 a 929 (centro 652),
// linha de base em y≈685, cor marrom #6D441B
const CENTER_X = 644 // centro do container (compensa o espaço lateral da fonte)
const BASE_SIZE = 200
// Largura máxima do nome: "Victória" no tamanho cheio dá ~555px. Nome mais largo que isso
// diminui a letra para não encostar nas flores (esquerda) nem nos balões (direita).
const MAX_WIDTH = 580

// Lê da própria fonte a largura de cada letra (tabelas cmap + hmtx do TTF),
// para medir o nome com precisão antes de desenhar.
function makeMeasurer(buf: ArrayBuffer) {
  const v = new DataView(buf)
  const tables: Record<string, number> = {}
  for (let i = 0, n = v.getUint16(4); i < n; i++) {
    const p = 12 + i * 16
    const tag = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3))
    tables[tag] = v.getUint32(p + 8)
  }
  const unitsPerEm = v.getUint16(tables.head + 18)
  const numHMetrics = v.getUint16(tables.hhea + 34)
  const advance = (gid: number) => v.getUint16(tables.hmtx + 4 * Math.min(gid, numHMetrics - 1))

  // cmap formato 4 (Windows Unicode BMP)
  let sub = 0
  for (let i = 0, n = v.getUint16(tables.cmap + 2); i < n; i++) {
    const p = tables.cmap + 4 + i * 8
    if (v.getUint16(p) === 3 && v.getUint16(p + 2) === 1) sub = tables.cmap + v.getUint32(p + 4)
  }
  const glyph = (code: number) => {
    if (!sub || v.getUint16(sub) !== 4) return 0
    const segX2 = v.getUint16(sub + 6)
    const ends = sub + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2
    for (let s = 0; s < segX2; s += 2) {
      if (code > v.getUint16(ends + s)) continue
      const start = v.getUint16(starts + s)
      if (code < start) return 0
      const ro = v.getUint16(ranges + s)
      if (!ro) return (code + v.getInt16(deltas + s)) & 0xffff
      const g = v.getUint16(ranges + s + ro + 2 * (code - start))
      return g ? (g + v.getInt16(deltas + s)) & 0xffff : 0
    }
    return 0
  }
  // largura do texto em "em" (multiplicar pelo tamanho da fonte)
  return (text: string) => {
    let units = 0
    for (const ch of text.normalize("NFC")) units += advance(glyph(ch.codePointAt(0)!))
    return units / unitsPerEm
  }
}

// "VICTÓRIA silva" -> "Victória"
function primeiroNome(nome: string) {
  const first = nome.trim().split(/\s+/)[0] ?? ""
  return first
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[-'])(\p{L})/gu, (_, sep, l) => sep + l.toLocaleUpperCase("pt-BR"))
}

let fontCache: ArrayBuffer | null = null
let measure: ((t: string) => number) | null = null
async function loadAllura() {
  if (fontCache) return fontCache
  // Sem User-Agent de navegador moderno o Google entrega TTF, que o gerador aceita
  const css = await fetch("https://fonts.googleapis.com/css2?family=Allura").then((r) => r.text())
  const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1]
  if (!url) throw new Error("Fonte Allura não encontrada")
  const data = await fetch(url).then((r) => r.arrayBuffer())
  measure = makeMeasurer(data)
  fontCache = data
  return data
}

export async function GET(req: NextRequest) {
  const nome = primeiroNome(req.nextUrl.searchParams.get("nome") ?? "").slice(0, 30)
  const font = await loadAllura()
  const base = new URL("/aniversario-base.jpg", req.url).toString()

  const width = (measure?.(nome) ?? 0) * BASE_SIZE
  const size = width > MAX_WIDTH ? Math.floor((BASE_SIZE * MAX_WIDTH) / width) : BASE_SIZE

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={base} width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }} alt="" />
        <div
          style={{
            position: "absolute",
            left: 0,
            width: CENTER_X * 2,
            // linha de base fixa em y≈685, qualquer que seja o tamanho da letra
            top: 685 - size * 0.695,
            display: "flex",
            justifyContent: "center",
            fontFamily: "Allura",
            fontSize: size,
            lineHeight: 1,
            color: "#6D441B",
          }}
        >
          {nome}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [{ name: "Allura", data: font, style: "normal", weight: 400 }],
      headers: { "Cache-Control": "public, max-age=86400" },
    }
  )
}
