"use client"

import { type RefObject } from "react"
import { Download, X } from "lucide-react"
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
  energeticObservations?: string | null
  therapeuticSuggestions?: string | null
  returnSchedule?: string | null
  involvedPeople?: Array<{ name: string; birthDate?: string | null; relation?: string | null }>
  questions?: Array<{ question: string; cards?: string | null; interpretation?: string | null }>
  energeticTips?: string | null
  spiritualPractice?: string | null
  additionalServices?: string | null
}

// ─── Ficha Interna A4 ─────────────────────────────────────────────────────────

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

  return (
    <div ref={divRef} style={{
      width: 794, minHeight: 1123,
      transform: `scale(${scale})`, transformOrigin: "top left",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      position: "relative", backgroundColor: "#fff", overflow: "hidden",
    }}>
      {profile.reportBg && (
        <img src={profile.reportBg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <div style={{ position: "relative", zIndex: 1, padding: 48 }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ width: 72, height: 72, flexShrink: 0 }}>
            {profile.logoUrl
              ? <img src={profile.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : <div style={{ width: "100%", height: "100%", border: "1.5px dashed #d1d5db", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 8, color: "#9ca3af", textAlign: "center" }}>Sem logo</span>
                </div>
            }
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#6d28d9", letterSpacing: 0.5, margin: 0, textTransform: "uppercase" }}>Ficha Interna</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>Data: {today}</p>
          </div>
        </div>

        <div style={{ borderTop: "2px solid #7c3aed", marginBottom: 20, opacity: 0.25 }} />

        {/* Cliente */}
        <p style={{ fontSize: 30, fontWeight: 800, color: "#111827", margin: "0 0 4px", lineHeight: 1.2 }}>
          {client?.name || <span style={{ color: "#d1d5db" }}>Nome da cliente</span>}
        </p>
        {client?.birthDate && (
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>Data de Nascimento: {formatDate(client.birthDate)}</p>
        )}

        {/* Pacote / valor */}
        {(service || data.productName) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f5f3ff", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Pacote recomendado</span>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#5b21b6", margin: "2px 0 0" }}>{service?.name || data.productName}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Valor da Sessão</span>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed", margin: "2px 0 0" }}>
                {service ? formatCurrency(service.price) : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Retorno */}
        {data.returnSchedule && (
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>Horários disponíveis para retorno: </span>
            {data.returnSchedule}
          </p>
        )}

        {/* Foco */}
        {data.mainSubject && (
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>Foco da sessão: </span>
            {data.mainSubject}
          </p>
        )}

        {/* Cartas */}
        {cards.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 14px" }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 10px" }}>🃏 Cartas da sessão:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cards.map((c, i) => (
                <div key={i}>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    <span style={{ fontWeight: 700, color: "#111827" }}>{c.card}</span>
                    {c.interpretation && <span style={{ color: "#4b5563" }}> → {c.interpretation}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Temas */}
        {data.topicsAddressed && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 14px" }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>🔮 Temas principais abordados:</p>
            <p style={{ fontSize: 13, color: "#4b5563", margin: 0, whiteSpace: "pre-line", lineHeight: 1.7 }}>{data.topicsAddressed}</p>
          </div>
        )}

        {/* Energético */}
        {data.energeticObservations && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 14px" }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>💓 Observações energéticas:</p>
            <p style={{ fontSize: 13, color: "#4b5563", margin: 0, whiteSpace: "pre-line", lineHeight: 1.7 }}>{data.energeticObservations}</p>
          </div>
        )}

        {/* Sugestão */}
        {data.therapeuticSuggestions && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 14px" }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>✨ Sugestão terapêutica para alinhamento:</p>
            <p style={{ fontSize: 13, color: "#4b5563", margin: 0, whiteSpace: "pre-line", lineHeight: 1.7 }}>{data.therapeuticSuggestions}</p>
          </div>
        )}

      </div>
    </div>
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
  const firstPerson = (data.involvedPeople ?? []).find((p) => p.name)
  const today = new Date().toLocaleDateString("pt-BR")

  // A4 at 96 dpi = 1123px height × 794px width
  const A4_HEIGHT = 1123

  return (
    <div ref={divRef} style={{
      width: 794,
      minHeight: A4_HEIGHT,
      transform: `scale(${scale})`, transformOrigin: "top left",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      backgroundColor: "#fff",
      backgroundImage: profile.reportBg ? `url(${profile.reportBg})` : undefined,
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center top",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Inner layout: flex column so signature sticks to bottom */}
      <div style={{ padding: 48, flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header row: logo left, title right */}
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

        {/* Divider */}
        <div style={{ borderTop: `2px solid ${accentColor}`, opacity: 0.4, margin: "14px 0" }} />

        {/* Centered client info */}
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

        {/* Divider */}
        <div style={{ borderTop: `2px solid ${accentColor}`, opacity: 0.4, margin: "14px 0" }} />

        {/* ── Content body ── */}

        {firstPerson && (
          <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", color: textColor, fontFamily: bodyFont, margin: "0 0 14px" }}>
            Pessoa de interesse: {firstPerson.name}
            {firstPerson.birthDate ? ` – ${formatDate(firstPerson.birthDate)}` : ""}
          </p>
        )}

        {(data.questions ?? []).filter((q) => q.question).map((q, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, fontStyle: "italic", color: accentColor, fontFamily: bodyFont, margin: "0 0 4px" }}>
              🌙 {q.question}
            </p>
            {q.cards && (
              <p style={{ fontSize: 13, color: textColor, fontFamily: bodyFont, margin: "0 0 6px", fontWeight: 600 }}>
                Cartas: {q.cards}
              </p>
            )}
            {q.interpretation && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: accentColor, fontSize: 16, lineHeight: 1 }}>•</span>
                <span style={{ fontSize: 13, color: textColor, fontFamily: bodyFont, lineHeight: 1.7, flex: 1, whiteSpace: "pre-line" }}>
                  {q.interpretation}
                </span>
              </div>
            )}
          </div>
        ))}

        {data.energeticTips && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, fontStyle: "italic", color: accentColor, fontFamily: bodyFont, margin: "0 0 6px" }}>
              🔮 Conselhos / Dicas Energéticas
            </p>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 8px" }} />
            <p style={{ fontSize: 13, color: textColor, fontFamily: bodyFont, lineHeight: 1.7, whiteSpace: "pre-line", margin: 0 }}>
              {data.energeticTips}
            </p>
          </div>
        )}

        {data.spiritualPractice && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, fontStyle: "italic", color: accentColor, fontFamily: bodyFont, margin: "0 0 6px" }}>
              🌸 Prática para a Espiritualidade
            </p>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 8px" }} />
            <p style={{ fontSize: 13, color: textColor, fontFamily: bodyFont, lineHeight: 1.7, whiteSpace: "pre-line", margin: 0 }}>
              {data.spiritualPractice}
            </p>
          </div>
        )}

        {data.additionalServices && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, fontStyle: "italic", color: accentColor, fontFamily: bodyFont, margin: "0 0 6px" }}>
              ✨ Rituais e Serviços Adicionais
            </p>
            <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 8px" }} />
            <p style={{ fontSize: 13, color: textColor, fontFamily: bodyFont, lineHeight: 1.7, whiteSpace: "pre-line", margin: 0 }}>
              {data.additionalServices}
            </p>
          </div>
        )}

        {/* Spacer — empurra a assinatura para o rodapé */}
        <div style={{ flex: 1 }} />

        {/* Signature — sempre no rodapé da página */}
        <div style={{ paddingTop: 24, paddingBottom: 8, textAlign: "center" }}>
          <div style={{ borderTop: `1px solid ${accentColor}`, opacity: 0.2, marginBottom: 20 }} />
          <span style={{ fontSize: 15, fontStyle: "italic", fontFamily: signatureFont, color: signatureColor, display: "block" }}>
            Com Carinho
          </span>
          <span style={{ fontSize: 19, fontStyle: "italic", fontFamily: signatureFont, fontWeight: 700, color: signatureColor, display: "block", marginTop: 4 }}>
            {therapistName}
          </span>
        </div>

      </div>
    </div>
  )
}

// ─── Modal de visualização ────────────────────────────────────────────────────

export function FichaPreviewModal({
  data, client, service, profile, onClose, onDownload,
}: {
  data: FichaPreviewData
  client: FichaClientData | undefined
  service: FichaServiceData | undefined
  profile: FichaProfile
  onClose: () => void
  onDownload: () => void
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
          {/* width e height = A4 * 0.8 — elimina espaço branco causado por transform */}
          <div style={{ width: 794 * 0.8, height: 1123 * 0.8, overflow: "hidden", position: "relative" }}>
            {isInternal
              ? <FichaInternaPreview data={data} client={client} service={service} profile={profile} scale={0.8} />
              : <RelatorioPreview data={data} client={client} service={service} profile={profile} scale={0.8} />
            }
          </div>
        </div>
      </div>
    </div>
  )
}
