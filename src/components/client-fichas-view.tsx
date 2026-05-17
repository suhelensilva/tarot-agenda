"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowLeft, ClipboardList, FileText, Maximize2, Plus, Trash2 } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import {
  FichaInternaPreview,
  RelatorioPreview,
  FichaPreviewModal,
  type FichaPreviewData,
  type FichaProfile,
  type FichaServiceData,
  type FichaClientData,
} from "@/components/ficha-preview"

// ─── Types ────────────────────────────────────────────────────────────────────

type InvolvedPerson = { name: string; birthDate: string; relation: string }
type Question = { question: string; cards: string; interpretation: string }

type FichaForm = {
  type: "INTERNAL" | "REPORT"
  serviceId: string
  mainSubject: string
  productName: string
  involvedPeople: InvolvedPerson[]
  mainComplaint: string
  complaintText: string
  topicsAddressed: string
  energeticObservations: string
  therapeuticSuggestions: string
  returnSchedule: string
  questions: Question[]
  energeticTips: string
  spiritualPractice: string
  additionalServices: string
}

type SavedFicha = {
  id: string
  type: "INTERNAL" | "REPORT"
  createdAt: string
  mainSubject: string | null
  productName: string | null
  serviceId: string | null
  mainComplaint: string | null
  complaintText: string | null
  topicsAddressed: string | null
  energeticObservations: string | null
  therapeuticSuggestions: string | null
  returnSchedule: string | null
  involvedPeople: Array<{ name: string; birthDate?: string | null; relation?: string | null }>
  questions: Array<{ question: string; cards?: string | null; interpretation?: string | null }>
  energeticTips: string | null
  spiritualPractice: string | null
  additionalServices: string | null
  client: { id: string; name: string; birthDate: string | null }
}

type Props = {
  clientId: string
  clientName: string
  clientBirthDate: string | null
  services: Array<{ id: string; name: string; price: number; active: boolean }>
  profile: FichaProfile
  onCountChange?: (internal: number, reports: number) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
const TEXTAREA_CLS = INPUT_CLS + " resize-none"

const emptyForm = (type: "INTERNAL" | "REPORT"): FichaForm => ({
  type,
  serviceId: "",
  mainSubject: "",
  productName: "",
  involvedPeople: [],
  mainComplaint: "",
  complaintText: "",
  topicsAddressed: "",
  energeticObservations: "",
  therapeuticSuggestions: "",
  returnSchedule: "",
  questions: [],
  energeticTips: "",
  spiritualPractice: "",
  additionalServices: "",
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientFichasView({
  clientId,
  clientName,
  clientBirthDate,
  services,
  profile,
  onCountChange,
}: Props) {
  const [view, setView] = useState<"list" | "form">("list")
  const [fichas, setFichas] = useState<SavedFicha[]>([])
  const [loadingFichas, setLoadingFichas] = useState(true)

  // Form state
  const [form, setForm] = useState<FichaForm>(emptyForm("INTERNAL"))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Preview / PDF state
  const [previewFicha, setPreviewFicha] = useState<SavedFicha | null>(null)
  const [showFichaModal, setShowFichaModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const onCountChangeRef = useRef(onCountChange)
  useEffect(() => { onCountChangeRef.current = onCountChange }, [onCountChange])

  // Form appearance customization (live preview; saved to profile on save)
  const [customTitleFont, setCustomTitleFont] = useState(profile.reportTitleFont || "Georgia, serif")
  const [customTitleColor, setCustomTitleColor] = useState(profile.reportTitleColor || "#4a1d96")
  const [customSignatureFont, setCustomSignatureFont] = useState(profile.reportSignatureFont || "Georgia, serif")
  const [customSignatureColor, setCustomSignatureColor] = useState(profile.reportSignatureColor || "#7c3aed")
  const [customFont, setCustomFont] = useState(profile.reportFont || "Georgia, serif")
  const [customTextColor, setCustomTextColor] = useState(profile.reportTextColor || "#374151")
  const [customAccentColor, setCustomAccentColor] = useState(profile.reportAccentColor || "#7c3aed")
  const [showAppearance, setShowAppearance] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)

  // Internal profile state — starts from parent prop, then fetches directly to ensure freshness
  const [resolvedProfile, setResolvedProfile] = useState<FichaProfile>(profile)

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((d) => {
        if (!d || d.error) return
        const p: FichaProfile = {
          logoUrl: d.logoUrl ?? null,
          reportBg: d.reportBg ?? null,
          signature: d.signature ?? null,
          slogan: d.slogan ?? null,
          reportTitleFont: d.reportTitleFont ?? null,
          reportTitleColor: d.reportTitleColor ?? null,
          reportSignatureFont: d.reportSignatureFont ?? null,
          reportSignatureColor: d.reportSignatureColor ?? null,
          reportFont: d.reportFont ?? null,
          reportTextColor: d.reportTextColor ?? null,
          reportAccentColor: d.reportAccentColor ?? null,
        }
        setResolvedProfile(p)
        // Sync customization defaults from profile (only if not yet changed by user)
        if (d.reportTitleFont) setCustomTitleFont(d.reportTitleFont)
        if (d.reportTitleColor) setCustomTitleColor(d.reportTitleColor)
        if (d.reportSignatureFont) setCustomSignatureFont(d.reportSignatureFont)
        if (d.reportSignatureColor) setCustomSignatureColor(d.reportSignatureColor)
        if (d.reportFont) setCustomFont(d.reportFont)
        if (d.reportTextColor) setCustomTextColor(d.reportTextColor)
        if (d.reportAccentColor) setCustomAccentColor(d.reportAccentColor)
      })
      .catch(() => {})
  }, [])

  // ── Data fetching ──────────────────────────────────────────────────────────

  const refreshFichas = useCallback(() => {
    setLoadingFichas(true)
    fetch(`/api/fichas?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        const list: SavedFicha[] = Array.isArray(d) ? d : []
        setFichas(list)
        setLoadingFichas(false)
        const cb = onCountChangeRef.current
        if (cb) {
          cb(
            list.filter((f) => f.type === "INTERNAL").length,
            list.filter((f) => f.type === "REPORT").length,
          )
        }
      })
      .catch(() => { setFichas([]); setLoadingFichas(false) })
  }, [clientId])

  useEffect(() => { refreshFichas() }, [refreshFichas])

  // ── Derived data ───────────────────────────────────────────────────────────

  const activeServices = services.filter((s) => s.active)
  const sortedFichas = [...fichas].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  const internalFichas = sortedFichas.filter((f) => f.type === "INTERNAL")
  const reportFichas = sortedFichas.filter((f) => f.type === "REPORT")

  // Preview helpers
  const previewData: FichaPreviewData | null = previewFicha
    ? {
        type: previewFicha.type,
        mainSubject: previewFicha.mainSubject,
        productName: previewFicha.productName,
        serviceId: previewFicha.serviceId,
        mainComplaint: previewFicha.mainComplaint,
        complaintText: previewFicha.complaintText,
        topicsAddressed: previewFicha.topicsAddressed,
        energeticObservations: previewFicha.energeticObservations,
        therapeuticSuggestions: previewFicha.therapeuticSuggestions,
        returnSchedule: previewFicha.returnSchedule,
        involvedPeople: previewFicha.involvedPeople,
        questions: previewFicha.questions ?? [],
        energeticTips: previewFicha.energeticTips,
        spiritualPractice: previewFicha.spiritualPractice,
        additionalServices: previewFicha.additionalServices,
      }
    : null

  const previewClient: FichaClientData | undefined = previewFicha
    ? { id: previewFicha.client.id, name: previewFicha.client.name, birthDate: previewFicha.client.birthDate }
    : undefined

  const previewService: FichaServiceData | undefined =
    previewFicha?.serviceId
      ? services.find((s) => s.id === previewFicha.serviceId)
      : undefined

  // Live form preview helpers
  const formPreviewData: FichaPreviewData = {
    type: form.type,
    mainSubject: form.mainSubject || null,
    productName: form.productName || (form.serviceId ? services.find((s) => s.id === form.serviceId)?.name ?? null : null),
    serviceId: form.serviceId || null,
    mainComplaint: form.mainComplaint || null,
    complaintText: form.complaintText || null,
    topicsAddressed: form.topicsAddressed || null,
    energeticObservations: form.energeticObservations || null,
    therapeuticSuggestions: form.therapeuticSuggestions || null,
    returnSchedule: form.returnSchedule || null,
    involvedPeople: form.involvedPeople.filter((p) => p.name),
    questions: form.questions.filter((q) => q.question),
    energeticTips: form.energeticTips || null,
    spiritualPractice: form.spiritualPractice || null,
    additionalServices: form.additionalServices || null,
  }

  const formClient: FichaClientData = {
    id: clientId,
    name: clientName,
    birthDate: clientBirthDate,
  }

  const formService: FichaServiceData | undefined = form.serviceId
    ? services.find((s) => s.id === form.serviceId)
    : undefined

  // localProfile: resolvedProfile overridden by live customization (used in form view preview)
  const localProfile: FichaProfile = {
    ...resolvedProfile,
    reportTitleFont: customTitleFont,
    reportTitleColor: customTitleColor,
    reportSignatureFont: customSignatureFont,
    reportSignatureColor: customSignatureColor,
    reportFont: customFont,
    reportTextColor: customTextColor,
    reportAccentColor: customAccentColor,
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openForm(type: "INTERNAL" | "REPORT") {
    setForm(emptyForm(type))
    setSaveError(null)
    setView("form")
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const body = {
        clientId,
        type: form.type,
        serviceId: form.serviceId || null,
        mainSubject: form.mainSubject || null,
        productName: form.productName || null,
        involvedPeople: form.involvedPeople.filter((p) => p.name),
        mainComplaint: form.mainComplaint || null,
        complaintText: form.complaintText || null,
        topicsAddressed: form.topicsAddressed || null,
        energeticObservations: form.energeticObservations || null,
        therapeuticSuggestions: form.therapeuticSuggestions || null,
        returnSchedule: form.returnSchedule || null,
        questions: form.questions.filter((q) => q.question),
        energeticTips: form.energeticTips || null,
        spiritualPractice: form.spiritualPractice || null,
        additionalServices: form.additionalServices || null,
      }
      const res = await fetch("/api/fichas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? "Erro ao salvar")
      }
      refreshFichas()
      setView("list")
      if (form.type === "REPORT") {
        fetch("/api/perfil", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportTitleFont: customTitleFont,
            reportTitleColor: customTitleColor,
            reportSignatureFont: customSignatureFont,
            reportSignatureColor: customSignatureColor,
            reportFont: customFont,
            reportTextColor: customTextColor,
            reportAccentColor: customAccentColor,
          }),
        }).catch(() => {})
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadFicha() {
    if (!printRef.current) {
      setDownloadError("Elemento de prévia não encontrado. Tente novamente.")
      return
    }
    setDownloading(true)
    setDownloadError(null)
    try {
      const html2canvas = (await import("html2canvas")).default

      // jsPDF v4 changed to default export; handle both v2 and v4
      const jspdfMod = await import("jspdf")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JsPDF: any = (jspdfMod as any).jsPDF ?? (jspdfMod as any).default ?? jspdfMod

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 794,
        logging: false,
      })

      const imgData = canvas.toDataURL("image/jpeg", 0.92)
      const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth: number = pdf.internal.pageSize.getWidth()
      const pageHeight: number = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * pageWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 1) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const tipo = (previewFicha?.type ?? "INTERNAL") === "INTERNAL" ? "ficha" : "relatorio"
      const nome = (previewFicha?.client?.name ?? clientName).replace(/\s+/g, "-")
      pdf.save(`${tipo}-${nome}-${new Date().toISOString().slice(0, 10)}.pdf`)
      setPreviewFicha(null)
    } catch (e) {
      console.error("PDF error:", e)
      const msg = e instanceof Error ? e.message : String(e)
      setDownloadError(`Erro ao gerar PDF: ${msg}`)
    } finally {
      setDownloading(false)
    }
  }

  // ── Involved people helpers ────────────────────────────────────────────────

  function addPerson() {
    setForm((f) => ({
      ...f,
      involvedPeople: [...f.involvedPeople, { name: "", birthDate: "", relation: "" }],
    }))
  }

  function updatePerson(idx: number, field: keyof InvolvedPerson, value: string) {
    setForm((f) => {
      const arr = [...f.involvedPeople]
      arr[idx] = { ...arr[idx], [field]: value }
      return { ...f, involvedPeople: arr }
    })
  }

  function removePerson(idx: number) {
    setForm((f) => ({
      ...f,
      involvedPeople: f.involvedPeople.filter((_, i) => i !== idx),
    }))
  }

  // ── Question helpers ───────────────────────────────────────────────────────

  function addQuestion() {
    setForm((f) => ({
      ...f,
      questions: [...f.questions, { question: "", cards: "", interpretation: "" }],
    }))
  }

  function updateQuestion(idx: number, field: keyof Question, value: string) {
    setForm((f) => {
      const arr = [...f.questions]
      arr[idx] = { ...arr[idx], [field]: value }
      return { ...f, questions: arr }
    })
  }

  function removeQuestion(idx: number) {
    setForm((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== idx),
    }))
  }

  // ── Render: List view ──────────────────────────────────────────────────────

  if (view === "list") {
    return (
      <div className="max-w-2xl">
        {/* Sections */}
        <FichaSection
          title="Ficha Interna"
          badgeCls="bg-purple-100 text-purple-700"
          icon={<ClipboardList size={16} className="text-purple-600" />}
          iconBgCls="bg-purple-100"
          fichas={internalFichas}
          loading={loadingFichas}
          emptyText="Nenhuma ficha interna ainda"
          type="INTERNAL"
          onCreateClick={() => openForm("INTERNAL")}
          onRowClick={(f) => { setPreviewFicha(f); setShowFichaModal(true) }}
        />

        <div className="mt-6">
          <FichaSection
            title="Relatórios de Atendimento"
            badgeCls="bg-indigo-100 text-indigo-700"
            icon={<FileText size={16} className="text-indigo-600" />}
            iconBgCls="bg-indigo-100"
            fichas={reportFichas}
            loading={loadingFichas}
            emptyText="Nenhum relatório ainda"
            type="REPORT"
            onCreateClick={() => openForm("REPORT")}
            onRowClick={(f) => { setPreviewFicha(f); setShowFichaModal(true) }}
          />
        </div>

        {/* Preview modal */}
        {showFichaModal && previewData && previewClient && (
          <FichaPreviewModal
            data={previewData}
            client={previewClient}
            service={previewService}
            profile={resolvedProfile}
            onClose={() => { setShowFichaModal(false); setTimeout(() => setPreviewFicha(null), 200) }}
            onDownload={() => {
              setShowFichaModal(false)
              setTimeout(handleDownloadFicha, 100)
            }}
          />
        )}

        {/* Off-screen div for PDF */}
        {previewData && previewClient && (
          <div style={{ position: "fixed", left: -9999, top: 0, zIndex: -1, pointerEvents: "none" }}>
            {previewData.type === "INTERNAL"
              ? <FichaInternaPreview data={previewData} client={previewClient} service={previewService} profile={resolvedProfile} scale={1} divRef={printRef} />
              : <RelatorioPreview data={previewData} client={previewClient} service={previewService} profile={resolvedProfile} scale={1} divRef={printRef} />
            }
          </div>
        )}

        {/* Download feedback */}
        {downloading && (
          <div className="fixed bottom-6 right-6 z-50 bg-purple-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
            Gerando PDF...
          </div>
        )}
        {downloadError && (
          <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-lg max-w-sm">
            {downloadError}
            <button onClick={() => setDownloadError(null)} className="ml-3 underline text-xs opacity-80">fechar</button>
          </div>
        )}
      </div>
    )
  }

  // ── Render: Form view ──────────────────────────────────────────────────────

  const isInternal = form.type === "INTERNAL"

  return (
    <div className="max-w-full">
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors"
        >
          <ArrowLeft size={15} /> Voltar
        </button>
        <span className="text-gray-300">·</span>
        <h2 className="text-base font-semibold text-gray-900">
          {isInternal ? "Nova Ficha Interna" : "Novo Relatório de Atendimento"}
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Left: form ── */}
        <div className="flex-1 min-w-0 max-w-lg">

          {/* Client info (read-only) */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
              {clientName[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{clientName}</p>
              {clientBirthDate && (
                <p className="text-xs text-gray-500">Nasc. {formatDate(clientBirthDate)}</p>
              )}
            </div>
          </div>

          {/* Common fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isInternal ? "Foco da sessão" : "Assunto principal"}
              </label>
              <input
                value={form.mainSubject}
                onChange={(e) => setForm({ ...form, mainSubject: e.target.value })}
                className={INPUT_CLS}
                placeholder={isInternal ? "Ex: autoconhecimento, amor..." : "Ex: relacionamento, trabalho..."}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vincular serviço</label>
              <select
                value={form.serviceId}
                onChange={(e) => {
                  const svc = activeServices.find((s) => s.id === e.target.value)
                  setForm({ ...form, serviceId: e.target.value, productName: svc ? svc.name : form.productName })
                }}
                className={INPUT_CLS}
              >
                <option value="">— Nenhum —</option>
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatCurrency(s.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do produto (personalizado)
              </label>
              <input
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                className={INPUT_CLS}
                placeholder="Deixe em branco para usar o nome do serviço"
              />
            </div>

            {/* INTERNAL-only fields */}
            {isInternal && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horários para retorno
                  </label>
                  <input
                    value={form.returnSchedule}
                    onChange={(e) => setForm({ ...form, returnSchedule: e.target.value })}
                    className={INPUT_CLS}
                    placeholder="Ex: terças das 14h às 18h"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔮 Temas abordados
                  </label>
                  <textarea
                    rows={3}
                    value={form.topicsAddressed}
                    onChange={(e) => setForm({ ...form, topicsAddressed: e.target.value })}
                    className={TEXTAREA_CLS}
                    placeholder="Descreva os temas principais abordados na sessão..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    💓 Observações energéticas
                  </label>
                  <textarea
                    rows={3}
                    value={form.energeticObservations}
                    onChange={(e) => setForm({ ...form, energeticObservations: e.target.value })}
                    className={TEXTAREA_CLS}
                    placeholder="Observações energéticas da sessão..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ✨ Sugestões terapêuticas
                  </label>
                  <textarea
                    rows={3}
                    value={form.therapeuticSuggestions}
                    onChange={(e) => setForm({ ...form, therapeuticSuggestions: e.target.value })}
                    className={TEXTAREA_CLS}
                    placeholder="Sugestões terapêuticas para alinhamento..."
                  />
                </div>
              </>
            )}

            {/* REPORT-only fields */}
            {!isInternal && (
              <>
                {/* Mais pessoas envolvidas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Mais pessoas envolvidas
                    </label>
                    <button
                      type="button"
                      onClick={addPerson}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-500 font-medium border border-purple-200 hover:border-purple-400 rounded-md px-2 py-1 transition-colors"
                    >
                      <Plus size={12} /> Adicionar
                    </button>
                  </div>
                  {form.involvedPeople.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhuma pessoa adicionada</p>
                  ) : (
                    <div className="space-y-3">
                      {form.involvedPeople.map((p, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Pessoa {i + 1}</span>
                            <button
                              type="button"
                              onClick={() => removePerson(i)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <input
                            value={p.name}
                            onChange={(e) => updatePerson(i, "name", e.target.value)}
                            className={INPUT_CLS}
                            placeholder="Nome"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={p.birthDate}
                              onChange={(e) => updatePerson(i, "birthDate", e.target.value)}
                              className={INPUT_CLS}
                            />
                            <input
                              value={p.relation}
                              onChange={(e) => updatePerson(i, "relation", e.target.value)}
                              className={INPUT_CLS}
                              placeholder="Relação (ex: mãe)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Perguntas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Perguntas da sessão
                    </label>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-500 font-medium border border-purple-200 hover:border-purple-400 rounded-md px-2 py-1 transition-colors"
                    >
                      <Plus size={12} /> Adicionar pergunta
                    </button>
                  </div>
                  {form.questions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhuma pergunta adicionada</p>
                  ) : (
                    <div>
                      {form.questions.map((q, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Pergunta {i + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeQuestion(i)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <input
                            value={q.question}
                            onChange={(e) => updateQuestion(i, "question", e.target.value)}
                            className={INPUT_CLS}
                            placeholder="Ex: Como está meu relacionamento?"
                          />
                          <input
                            value={q.cards}
                            onChange={(e) => updateQuestion(i, "cards", e.target.value)}
                            className={INPUT_CLS}
                            placeholder="Ex: A Morte + A Lua"
                          />
                          <textarea
                            rows={3}
                            value={q.interpretation}
                            onChange={(e) => updateQuestion(i, "interpretation", e.target.value)}
                            className={TEXTAREA_CLS}
                            placeholder="Descreva o que foi visto nessa tiragem..."
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dicas Energéticas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dicas energéticas e conselhos
                  </label>
                  <textarea
                    rows={3}
                    value={form.energeticTips}
                    onChange={(e) => setForm({ ...form, energeticTips: e.target.value })}
                    className={TEXTAREA_CLS}
                    placeholder="Ex: Mantenha o coração aberto, frequência 528Hz..."
                  />
                </div>

                {/* Prática para a Espiritualidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prática para a Espiritualidade
                  </label>
                  <textarea
                    rows={3}
                    value={form.spiritualPractice}
                    onChange={(e) => setForm({ ...form, spiritualPractice: e.target.value })}
                    className={TEXTAREA_CLS}
                    placeholder="Ex: Declare em voz alta: eu entrego esse relacionamento..."
                  />
                </div>

                {/* Rituais e Serviços Adicionais */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rituais e serviços adicionais
                  </label>
                  <textarea
                    rows={3}
                    value={form.additionalServices}
                    onChange={(e) => setForm({ ...form, additionalServices: e.target.value })}
                    className={TEXTAREA_CLS}
                    placeholder="Ex: Banho de ervas, vela verde..."
                  />
                </div>
              </>
            )}
          </div>

          {/* Appearance section (REPORT only) */}
          {!isInternal && (
            <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAppearance(!showAppearance)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
              >
                <span className="font-medium text-gray-700">🎨 Aparência do relatório</span>
                <span className="text-gray-400 text-xs">{showAppearance ? "▲" : "▼"}</span>
              </button>
              {showAppearance && (
                <div className="p-4 space-y-5 bg-white">
                  <FontColorRow
                    label="Título"
                    hint="Nome da cliente + cabeçalho do relatório"
                    fontValue={customTitleFont}
                    onFontChange={setCustomTitleFont}
                    colorValue={customTitleColor}
                    onColorChange={setCustomTitleColor}
                  />
                  <FontColorRow
                    label="Assinatura / Marca"
                    hint="Rodapé «Com Carinho + nome da terapeuta»"
                    fontValue={customSignatureFont}
                    onFontChange={setCustomSignatureFont}
                    colorValue={customSignatureColor}
                    onColorChange={setCustomSignatureColor}
                  />
                  <FontColorRow
                    label="Corpo do texto"
                    hint="Perguntas (subtítulos em negrito) e parágrafos"
                    fontValue={customFont}
                    onFontChange={setCustomFont}
                    colorValue={customTextColor}
                    onColorChange={setCustomTextColor}
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cor de destaque <span className="text-gray-400 font-normal">(seções, divisórias)</span></label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={customAccentColor} onChange={(e) => setCustomAccentColor(e.target.value)}
                        className="w-9 h-9 rounded cursor-pointer border border-gray-200 p-0.5" />
                      <span className="text-xs text-gray-400 font-mono">{customAccentColor}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Configurações salvas no perfil e aplicadas a todos os relatórios.</p>
                </div>
              )}
            </div>
          )}

          {/* Save */}
          {saveError && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Salvando..." : isInternal ? "Salvar Ficha Interna" : "Salvar Relatório"}
          </button>
        </div>

        {/* ── Right: A4 preview ── */}
        <div className="hidden lg:block shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Prévia</p>
            <button
              onClick={() => setShowFormModal(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 border border-gray-200 hover:border-purple-300 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <Maximize2 size={12} /> Ver maior
            </button>
          </div>
          {/* width e height = A4 * 0.46 — elimina espaço branco causado por transform */}
          <div style={{ width: 794 * 0.46, height: 1123 * 0.46, overflow: "hidden", position: "relative", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            {isInternal
              ? <FichaInternaPreview data={formPreviewData} client={formClient} service={formService} profile={localProfile} scale={0.46} />
              : <RelatorioPreview data={formPreviewData} client={formClient} service={formService} profile={localProfile} scale={0.46} />
            }
          </div>
        </div>
      </div>

      {/* "Ver maior" modal for form view */}
      {showFormModal && (
        <FichaPreviewModal
          data={formPreviewData}
          client={formClient}
          service={formService}
          profile={localProfile}
          onClose={() => setShowFormModal(false)}
          onDownload={() => { setShowFormModal(false) }}
        />
      )}
    </div>
  )
}

// ─── FontColorRow sub-component ───────────────────────────────────────────────

const FONT_OPTIONS = [
  { value: "Georgia, serif", label: "Georgia (elegante)" },
  { value: "Palatino Linotype, Palatino, serif", label: "Palatino (clássica)" },
  { value: "Garamond, serif", label: "Garamond (refinada)" },
  { value: "Trebuchet MS, sans-serif", label: "Trebuchet (arredondada)" },
  { value: "Arial, sans-serif", label: "Arial (moderna)" },
  { value: "Brush Script MT, cursive", label: "Brush Script (manuscrita)" },
]

function FontColorRow({
  label, hint, fontValue, onFontChange, colorValue, onColorChange,
}: {
  label: string
  hint: string
  fontValue: string
  onFontChange: (v: string) => void
  colorValue: string
  onColorChange: (v: string) => void
}) {
  return (
    <div className="border border-gray-100 rounded-lg p-3 space-y-2">
      <div>
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={fontValue}
          onChange={(e) => onFontChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          {FONT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="color"
            value={colorValue}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5"
          />
          <span className="text-xs text-gray-400 font-mono w-14">{colorValue}</span>
        </div>
      </div>
      {/* Font preview */}
      <p style={{ fontFamily: fontValue, color: colorValue, fontSize: 14, margin: 0, lineHeight: 1.4 }}>
        Luz e Alma Terapias — Relatório de Atendimento
      </p>
    </div>
  )
}

// ─── FichaSection sub-component ───────────────────────────────────────────────

function FichaSection({
  title,
  badgeCls,
  icon,
  iconBgCls,
  fichas,
  loading,
  emptyText,
  type,
  onCreateClick,
  onRowClick,
}: {
  title: string
  badgeCls: string
  icon: React.ReactNode
  iconBgCls: string
  fichas: SavedFicha[]
  loading: boolean
  emptyText: string
  type: "INTERNAL" | "REPORT"
  onCreateClick: () => void
  onRowClick: (f: SavedFicha) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <button
          onClick={onCreateClick}
          className={`flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 transition-colors ${
            type === "INTERNAL"
              ? "text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-400"
              : "text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400"
          }`}
        >
          <Plus size={12} /> Criar
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8 text-sm">Carregando...</div>
      ) : fichas.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {fichas.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50/30 transition-colors cursor-pointer"
              onClick={() => onRowClick(f)}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBgCls}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeCls}`}>
                    {f.type === "INTERNAL" ? "Ficha Interna" : "Relatório"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {f.mainSubject && <span>{f.mainSubject} · </span>}
                  {f.productName && <span className="text-gray-400">{f.productName} · </span>}
                  <span className="text-gray-400">{new Date(f.createdAt).toLocaleDateString("pt-BR")}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
