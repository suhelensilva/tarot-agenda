"use client"

import { useState, useEffect, useRef } from "react"
import {
  FileText, ClipboardList, Search, Plus, X, Tag, Trash2,
  Download, Maximize2, Eye, ChevronRight,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import {
  FichaInternaPreview, RelatorioPreview, FichaPreviewModal,
  type FichaPreviewData, type FichaProfile, type FichaServiceData, type FichaClientData,
} from "@/components/ficha-preview"

type Client = { id: string; name: string; birthDate: string | null }
type Service = { id: string; name: string; price: number; active: boolean }
type InvolvedPerson = { name: string; birthDate: string; relation: string }
type FichaForm = {
  clientId: string; type: "INTERNAL" | "REPORT"
  serviceId: string; mainSubject: string; productName: string
  involvedPeople: InvolvedPerson[]
  mainComplaint: string; complaintText: string
  topicsAddressed: string; energeticObservations: string
  therapeuticSuggestions: string; returnSchedule: string
}

type SavedFicha = {
  id: string; type: "INTERNAL" | "REPORT"; createdAt: string
  mainSubject: string | null; productName: string | null
  serviceId: string | null; mainComplaint: string | null
  topicsAddressed: string | null
  energeticObservations: string | null; therapeuticSuggestions: string | null
  returnSchedule: string | null; involvedPeople: InvolvedPerson[]
  complaintText: string | null
  client: { id: string; name: string; birthDate: string | null }
}

const emptyForm: FichaForm = {
  clientId: "", type: "INTERNAL", serviceId: "", mainSubject: "", productName: "",
  involvedPeople: [], mainComplaint: "", complaintText: "",
  topicsAddressed: "", energeticObservations: "",
  therapeuticSuggestions: "", returnSchedule: "",
}
const emptyPerson: InvolvedPerson = { name: "", birthDate: "", relation: "" }

// ─── Principal ────────────────────────────────────────────────────────────────
export default function FichasTab({
  clients,
  defaultClientId,
  defaultClientName,
}: {
  clients: Client[]
  defaultClientId?: string
  defaultClientName?: string
}) {
  const [step, setStep] = useState<"list" | "choose" | "form">("list")
  const [form, setForm] = useState<FichaForm>(() =>
    defaultClientId ? { ...emptyForm, clientId: defaultClientId } : emptyForm
  )
  const [clientSearch, setClientSearch] = useState(defaultClientName ?? "")
  const [showClientList, setShowClientList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [services, setServices] = useState<Service[]>([])
  const [profile, setProfile] = useState<FichaProfile>({ logoUrl: null, reportBg: null })
  const [fichas, setFichas] = useState<SavedFicha[]>([])
  const [loadingFichas, setLoadingFichas] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/servicos").then((r) => r.json()).then((d) => setServices(d.filter((s: Service) => s.active))).catch(() => {})
    fetch("/api/perfil").then((r) => r.json()).then((d) => setProfile({ logoUrl: d.logoUrl, reportBg: d.reportBg })).catch(() => {})
    fetchFichas()
    // Se veio com cliente pré-selecionado, pula direto para a etapa de escolha
    if (defaultClientId) setStep("choose")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchFichas() {
    setLoadingFichas(true)
    try {
      const res = await fetch("/api/fichas")
      const data = await res.json()
      setFichas(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("fetchFichas error:", e)
      setFichas([])
    } finally {
      setLoadingFichas(false)
    }
  }

  const selectedClient = clients.find((c) => c.id === form.clientId)
  const selectedService = services.find((s) => s.id === form.serviceId)
  const filteredClients = clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()))

  function selectClient(c: Client) {
    setForm((f) => ({ ...f, clientId: c.id }))
    setClientSearch(c.name)
    setShowClientList(false)
  }

  function reset() { setStep("list"); setForm(emptyForm); setClientSearch("") }

  function addPerson() { setForm((f) => ({ ...f, involvedPeople: [...f.involvedPeople, { ...emptyPerson }] })) }
  function updatePerson(i: number, field: keyof InvolvedPerson, value: string) {
    setForm((f) => { const arr = [...f.involvedPeople]; arr[i] = { ...arr[i], [field]: value }; return { ...f, involvedPeople: arr } })
  }
  function removePerson(i: number) { setForm((f) => ({ ...f, involvedPeople: f.involvedPeople.filter((_, idx) => idx !== i) })) }

  async function handleDownload() {
    if (!printRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", width: 794, height: 1123 })
      const imgData = canvas.toDataURL("image/jpeg", 0.95)
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      pdf.addImage(imgData, "JPEG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight())
      const name = selectedClient?.name ?? form.clientId ?? "ficha"
      const tipo = form.type === "INTERNAL" ? "ficha" : "relatorio"
      pdf.save(`${tipo}-${name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) { console.error("PDF error:", e) }
    setDownloading(false)
  }

  async function handleSave() {
    if (!form.clientId) return
    setSaving(true)
    setSaveError("")
    try {
      const res = await fetch("/api/fichas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data?.error ?? `Erro ${res.status}`)
        setSaving(false)
        return
      }
      setSaving(false)
      setSaved(true)
      setTimeout(async () => { setSaved(false); await fetchFichas(); reset() }, 1200)
    } catch (e) {
      console.error("handleSave error:", e)
      setSaveError("Erro de conexão ao salvar")
      setSaving(false)
    }
  }

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
  const ta = `${inp} resize-none`
  const isInternal = form.type === "INTERNAL"
  const previewScale = 0.46

  // form como FichaPreviewData (compatível estruturalmente)
  const formAsPreview: FichaPreviewData = form
  const clientAsData: FichaClientData | undefined = selectedClient
  const serviceAsData: FichaServiceData | undefined = selectedService

  // ── LISTA ────────────────────────────────────────────────────────────────────
  if (step === "list") {
    const listClient = clients.find((c) => c.id === form.clientId)
    const listService = services.find((s) => s.id === form.serviceId)
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Fichas e Relatórios</h2>
            <p className="text-gray-500 text-sm mt-1">{fichas.length} registro{fichas.length !== 1 ? "s" : ""} salvos</p>
          </div>
          <button
            onClick={() => setStep("choose")}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Nova ficha
          </button>
        </div>

        {loadingFichas ? (
          <div className="text-center text-gray-400 py-16">Carregando...</div>
        ) : fichas.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma ficha criada ainda</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Nova ficha" para começar</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {fichas.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50/30 transition-colors cursor-pointer"
                onClick={() => {
                  setForm({
                    clientId: f.client.id,
                    type: f.type,
                    serviceId: f.serviceId ?? "",
                    mainSubject: f.mainSubject ?? "",
                    productName: f.productName ?? "",
                    involvedPeople: f.involvedPeople ?? [],
                    mainComplaint: f.mainComplaint ?? "",
                    complaintText: f.complaintText ?? "",
                    topicsAddressed: f.topicsAddressed ?? "",
                    energeticObservations: f.energeticObservations ?? "",
                    therapeuticSuggestions: f.therapeuticSuggestions ?? "",
                    returnSchedule: f.returnSchedule ?? "",
                  })
                  setClientSearch(f.client.name)
                  setShowModal(true)
                }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${f.type === "INTERNAL" ? "bg-purple-100" : "bg-indigo-100"}`}>
                  {f.type === "INTERNAL"
                    ? <ClipboardList size={18} className="text-purple-600" />
                    : <FileText size={18} className="text-indigo-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900">{f.client.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${f.type === "INTERNAL" ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"}`}>
                      {f.type === "INTERNAL" ? "Ficha Interna" : "Relatório"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {f.mainSubject && <span>{f.mainSubject} · </span>}
                    {f.productName && <span>{f.productName} · </span>}
                    {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <FichaPreviewModal
            data={formAsPreview}
            client={listClient}
            service={listService}
            profile={profile}
            onClose={() => setShowModal(false)}
            onDownload={() => { setShowModal(false); handleDownload() }}
          />
        )}
        <div style={{ position: "fixed", left: -9999, top: 0, zIndex: -1, pointerEvents: "none" }}>
          {isInternal
            ? <FichaInternaPreview data={formAsPreview} client={listClient} service={listService} profile={profile} scale={1} divRef={printRef} />
            : <RelatorioPreview data={formAsPreview} client={listClient} service={listService} profile={profile} scale={1} divRef={printRef} />
          }
        </div>
      </div>
    )
  }

  // ── ESCOLHA ───────────────────────────────────────────────────────────────────
  if (step === "choose") {
    return (
      <div className="flex-1 p-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep("list")} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nova ficha</h2>
            <p className="text-gray-500 text-sm mt-0.5">Escolha o tipo</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <button onClick={() => { setForm({ ...emptyForm, type: "INTERNAL" }); setStep("form") }}
            className="flex flex-col items-start p-6 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 rounded-2xl transition-all text-left group">
            <div className="w-12 h-12 bg-purple-100 group-hover:bg-purple-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
              <ClipboardList size={22} className="text-purple-600" />
            </div>
            <p className="font-semibold text-gray-900 text-lg">Ficha Interna</p>
            <p className="text-gray-500 text-sm mt-1">Registro da sessão: temas, observações energéticas e sugestões terapêuticas</p>
          </button>
          <button onClick={() => { setForm({ ...emptyForm, type: "REPORT" }); setStep("form") }}
            className="flex flex-col items-start p-6 border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 rounded-2xl transition-all text-left group">
            <div className="w-12 h-12 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
              <FileText size={22} className="text-indigo-600" />
            </div>
            <p className="font-semibold text-gray-900 text-lg">Relatório de Atendimento</p>
            <p className="text-gray-500 text-sm mt-1">Layout A4 com fundo do Canva para enviar à cliente após a sessão</p>
          </button>
        </div>
      </div>
    )
  }

  // ── FORMULÁRIO + PREVIEW ──────────────────────────────────────────────────────
  return (
    <>
      {showModal && (
        <FichaPreviewModal
          data={formAsPreview}
          client={clientAsData}
          service={serviceAsData}
          profile={profile}
          onClose={() => setShowModal(false)}
          onDownload={() => { setShowModal(false); handleDownload() }}
        />
      )}

      {/* Print off-screen tamanho real */}
      <div style={{ position: "fixed", left: -9999, top: 0, zIndex: -1, pointerEvents: "none" }}>
        {isInternal
          ? <FichaInternaPreview data={formAsPreview} client={clientAsData} service={serviceAsData} profile={profile} scale={1} divRef={printRef} />
          : <RelatorioPreview data={formAsPreview} client={clientAsData} service={serviceAsData} profile={profile} scale={1} divRef={printRef} />
        }
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* Coluna esquerda: formulário */}
        <div className="flex-1 overflow-y-auto p-8 border-r border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h2 className="text-xl font-bold text-gray-900">
              {isInternal ? "Ficha Interna" : "Relatório de Atendimento"}
            </h2>
          </div>

          <div className="max-w-lg space-y-6">

            {/* Cliente */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Vincular a uma cliente *</p>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientList(true) }}
                  onFocus={() => setShowClientList(true)}
                  placeholder="Pesquisar cliente pelo nome..."
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                {showClientList && filteredClients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.map((c) => (
                      <button key={c.id} onClick={() => selectClient(c)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 text-gray-900">{c.name}</button>
                    ))}
                  </div>
                )}
              </div>
              {selectedClient && (
                <div className="mt-3">
                  <p className="text-base font-bold text-gray-900">{selectedClient.name}</p>
                  {selectedClient.birthDate && <p className="text-sm text-gray-500 mt-0.5">Nascimento: {formatDate(selectedClient.birthDate)}</p>}
                </div>
              )}
            </div>

            {/* Dados */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Dados do atendimento</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isInternal ? "Foco da sessão" : "Assunto principal"}</label>
                <input value={form.mainSubject} onChange={(e) => setForm({ ...form, mainSubject: e.target.value })} className={inp} placeholder="Ex: Amor, Trabalho, Família..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vincular produto / serviço</label>
                <select value={form.serviceId}
                  onChange={(e) => {
                    const s = services.find((s) => s.id === e.target.value)
                    setForm({ ...form, serviceId: e.target.value, productName: s?.name ?? form.productName })
                  }}
                  className={inp}>
                  <option value="">Selecionar produto...</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.price)}</option>)}
                </select>
                {selectedService && (
                  <div className="mt-2 flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                    <Tag size={13} className="text-purple-500" />
                    <span className="text-sm text-purple-700 font-medium">{selectedService.name}</span>
                    <span className="text-sm text-purple-500 ml-auto font-semibold">{formatCurrency(selectedService.price)}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do produto (personalizado)</label>
                <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className={inp} placeholder="Ou digite manualmente..." />
              </div>
            </div>

            {/* FICHA INTERNA */}
            {isInternal && (<>
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Horários disponíveis para retorno</p>
                <input value={form.returnSchedule} onChange={(e) => setForm({ ...form, returnSchedule: e.target.value })} className={inp} placeholder="Ex: A partir de sexta-feira, às 10h30" />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2"><span className="text-lg">🔮</span><p className="text-sm font-semibold text-gray-700">Temas principais abordados</p></div>
                <textarea rows={4} value={form.topicsAddressed} onChange={(e) => setForm({ ...form, topicsAddressed: e.target.value })} className={ta} placeholder={"Ex:\n- Retorno de questões do passado (karma)\n- Ciclos que não foram encerrados"} />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2"><span className="text-lg">💓</span><p className="text-sm font-semibold text-gray-700">Observações energéticas</p></div>
                <textarea rows={4} value={form.energeticObservations} onChange={(e) => setForm({ ...form, energeticObservations: e.target.value })} className={ta} placeholder={"Ex:\n- Indícios de desequilíbrio no chacra cardíaco\n- Emocional instável"} />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2"><span className="text-lg">✨</span><p className="text-sm font-semibold text-gray-700">Sugestão terapêutica para alinhamento</p></div>
                <textarea rows={4} value={form.therapeuticSuggestions} onChange={(e) => setForm({ ...form, therapeuticSuggestions: e.target.value })} className={ta} placeholder={"Ex:\n- Meditação curta (10 min)\n- Frequência 639Hz\n- Vela verde ou rosa"} />
              </div>
            </>)}

            {/* RELATÓRIO */}
            {!isInternal && (<>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Mais pessoas envolvidas</p>
                    <p className="text-xs text-gray-400">Outras pessoas que fazem parte da consulta</p>
                  </div>
                  <button onClick={addPerson} className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-500 font-medium"><Plus size={14} /> Adicionar</button>
                </div>
                {form.involvedPeople.length === 0 && <p className="text-sm text-gray-400 text-center py-3">Nenhuma pessoa adicionada</p>}
                <div className="space-y-4">
                  {form.involvedPeople.map((p, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pessoa {i + 1}</p>
                        <button onClick={() => removePerson(i)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                      <input value={p.name} onChange={(e) => updatePerson(i, "name", e.target.value)} className={inp} placeholder="Nome da pessoa" />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="date" value={p.birthDate} onChange={(e) => updatePerson(i, "birthDate", e.target.value)} className={inp} />
                        <input value={p.relation} onChange={(e) => updatePerson(i, "relation", e.target.value)} className={inp} placeholder="Ex: Marido, Filho..." />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Principal dor / queixa</p>
                <input value={form.mainComplaint} onChange={(e) => setForm({ ...form, mainComplaint: e.target.value })} className={inp} placeholder="Título da queixa..." />
                <textarea rows={5} value={form.complaintText} onChange={(e) => setForm({ ...form, complaintText: e.target.value })} className={ta} placeholder="Descreva com detalhes a dor ou queixa da cliente..." />
              </div>
            </>)}

            {/* Salvar */}
            <div className="flex gap-3 pb-8">
              <button onClick={reset} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <div className="flex-1 flex flex-col gap-1">
                {saveError && (
                  <p className="text-xs text-red-500 text-center">{saveError}</p>
                )}
                <button onClick={handleSave} disabled={saving || !form.clientId}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-medium transition-colors">
                  {saving ? "Salvando..." : saved ? "✓ Salvo!" : saveError ? "Tentar novamente" : isInternal ? "Salvar ficha" : "Salvar relatório"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna direita: preview A4 */}
        <div className="hidden lg:flex flex-col w-[430px] shrink-0 bg-gray-50 border-l border-gray-100">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Eye size={15} className="text-purple-500" /> Pré-visualização
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 border border-gray-200 hover:border-purple-300 rounded-lg px-2.5 py-1.5 transition-colors">
                <Maximize2 size={12} /> Ver maior
              </button>
              <button onClick={handleDownload} disabled={downloading || !form.clientId}
                className="flex items-center gap-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg px-2.5 py-1.5 transition-colors">
                <Download size={12} /> {downloading ? "Gerando..." : "Baixar PDF"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 flex justify-center">
            <div style={{ width: 794 * previewScale, height: 1123 * previewScale, overflow: "hidden", position: "relative", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", borderRadius: 6 }}>
              {isInternal
                ? <FichaInternaPreview data={formAsPreview} client={clientAsData} service={serviceAsData} profile={profile} scale={previewScale} />
                : <RelatorioPreview data={formAsPreview} client={clientAsData} service={serviceAsData} profile={profile} scale={previewScale} />
              }
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
