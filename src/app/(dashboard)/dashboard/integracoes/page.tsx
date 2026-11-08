"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Eye, EyeOff, Zap, Puzzle, Copy, RefreshCw, ChevronDown, ChevronUp, Pencil } from "lucide-react"

type MetaPixel = { id: string; name: string; pixelId: string; testEventCode: string | null }
type CrmList = { id: string; name: string; color: string; metaPixelId: string | null }

export default function IntegracoesPage() {
  const [pixels, setPixels] = useState<MetaPixel[]>([])
  const [crmLists, setCrmLists] = useState<CrmList[]>([])
  const [newPixel, setNewPixel] = useState({ name: "", pixelId: "", accessToken: "", testEventCode: "" })
  const [addingPixel, setAddingPixel] = useState(false)
  const [showAccessToken, setShowAccessToken] = useState(false)
  const [pixelError, setPixelError] = useState<string | null>(null)
  const [metaOpen, setMetaOpen] = useState(true)
  const [showAddPixel, setShowAddPixel] = useState(false)
  const [editingPixelId, setEditingPixelId] = useState<string | null>(null)
  const [editPixelData, setEditPixelData] = useState({ name: "", testEventCode: "" })

  const [crmToken, setCrmToken] = useState<string | null>(null)
  const [crmLoading, setCrmLoading] = useState(false)
  const [crmCopied, setCrmCopied] = useState(false)
  const [apiUrl, setApiUrl] = useState("")

  useEffect(() => {
    fetch("/api/meta-pixels").then((r) => r.json()).then((d) => setPixels(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/crm/lists").then((r) => r.json()).then((d) => setCrmLists(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/crm/token").then((r) => r.json()).then((d) => setCrmToken(d.token ?? null)).catch(() => {})
    if (typeof window !== "undefined") setApiUrl(window.location.origin)
  }, [])

  async function addPixel() {
    if (!newPixel.name.trim() || !newPixel.pixelId.trim() || !newPixel.accessToken.trim()) return
    setAddingPixel(true)
    setPixelError(null)
    try {
      const res = await fetch("/api/meta-pixels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPixel.name.trim(),
          pixelId: newPixel.pixelId.trim(),
          accessToken: newPixel.accessToken.trim(),
          testEventCode: newPixel.testEventCode.trim() || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro ao salvar")
      const created = await res.json()
      setPixels((prev) => [...prev, created])
      setNewPixel({ name: "", pixelId: "", accessToken: "", testEventCode: "" })
      setShowAddPixel(false)
    } catch (e) {
      setPixelError(e instanceof Error ? e.message : "Erro ao salvar pixel")
    } finally {
      setAddingPixel(false)
    }
  }

  async function updatePixel(id: string) {
    const res = await fetch(`/api/meta-pixels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editPixelData.name, testEventCode: editPixelData.testEventCode || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPixels((prev) => prev.map((p) => p.id === id ? { ...p, name: updated.name, testEventCode: updated.testEventCode } : p))
      setEditingPixelId(null)
    }
  }

  async function deletePixel(id: string) {
    await fetch(`/api/meta-pixels/${id}`, { method: "DELETE" })
    setPixels((prev) => prev.filter((p) => p.id !== id))
    setCrmLists((prev) => prev.map((l) => l.metaPixelId === id ? { ...l, metaPixelId: null } : l))
  }

  async function assignPixelToList(listId: string, pixelId: string | null) {
    setCrmLists((prev) => prev.map((l) => l.id === listId ? { ...l, metaPixelId: pixelId } : l))
    await fetch(`/api/crm/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaPixelId: pixelId }),
    })
  }

  async function generateCrmToken() {
    setCrmLoading(true)
    try {
      const res = await fetch("/api/crm/token", { method: "POST" })
      const d = await res.json()
      setCrmToken(d.token ?? null)
    } finally {
      setCrmLoading(false)
    }
  }

  function copyCrmToken() {
    if (!crmToken) return
    navigator.clipboard.writeText(crmToken)
    setCrmCopied(true)
    setTimeout(() => setCrmCopied(false), 2000)
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrações</h1>

      {/* Meta CAPI */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl overflow-hidden">
        <button
          onClick={() => setMetaOpen((v) => !v)}
          className="w-full flex items-center gap-3 p-6 text-left hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        >
          <div className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={18} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Meta Conversions API (CAPI)</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Envie eventos de compra para o Meta Ads quando marcar um atendimento como Pago</p>
          </div>
          {metaOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
        </button>

        {metaOpen && (
          <div className="px-6 pb-6 space-y-6 border-t border-gray-100 dark:border-[rgba(255,255,255,0.06)] pt-5">

            {/* Pixels cadastrados */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Pixels cadastrados</p>

              {pixels.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhum pixel cadastrado ainda.</p>
              )}

              {pixels.map((px) => (
                <div key={px.id} className="border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{px.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">ID: {px.pixelId}</p>
                      {px.testEventCode && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Modo teste: {px.testEventCode}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setEditingPixelId(px.id); setEditPixelData({ name: px.name, testEventCode: px.testEventCode ?? "" }) }}
                      className="text-gray-400 hover:text-blue-500 transition-colors shrink-0"
                      title="Editar pixel"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deletePixel(px.id)}
                      className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                      title="Remover pixel"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {editingPixelId === px.id && (
                    <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-[rgba(170,85,249,0.1)]">
                      <input
                        value={editPixelData.name}
                        onChange={(e) => setEditPixelData((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Nome"
                        className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] dark:text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <input
                        value={editPixelData.testEventCode}
                        onChange={(e) => setEditPixelData((d) => ({ ...d, testEventCode: e.target.value }))}
                        placeholder="Código de teste (deixe vazio para remover)"
                        className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] dark:text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => updatePixel(px.id)} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg transition-colors">Salvar</button>
                        <button onClick={() => setEditingPixelId(null)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1 rounded-lg transition-colors">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {!showAddPixel ? (
                <button onClick={() => setShowAddPixel(true)} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  <Plus size={14} />
                  Adicionar pixel
                </button>
              ) : (
                <div className="border border-dashed border-gray-300 dark:border-[rgba(170,85,249,0.2)] rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Novo pixel</p>
                  <input value={newPixel.name} onChange={(e) => setNewPixel((p) => ({ ...p, name: e.target.value }))} placeholder="Nome (ex: Pixel Principal)" className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] dark:text-gray-200 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <input value={newPixel.pixelId} onChange={(e) => setNewPixel((p) => ({ ...p, pixelId: e.target.value }))} placeholder="Pixel ID (ex: 1234567890)" className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] dark:text-gray-200 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <div className="relative">
                    <input value={newPixel.accessToken} onChange={(e) => setNewPixel((p) => ({ ...p, accessToken: e.target.value }))} type={showAccessToken ? "text" : "password"} placeholder="Access Token" className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] dark:text-gray-200 dark:placeholder-gray-600 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <button type="button" onClick={() => setShowAccessToken((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {showAccessToken ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <input value={newPixel.testEventCode} onChange={(e) => setNewPixel((p) => ({ ...p, testEventCode: e.target.value }))} placeholder="Código de teste (opcional, ex: TEST12345)" className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] dark:text-gray-200 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  {pixelError && <p className="text-xs text-red-500">{pixelError}</p>}
                  <div className="flex gap-2">
                    <button onClick={addPixel} disabled={addingPixel || !newPixel.name.trim() || !newPixel.pixelId.trim() || !newPixel.accessToken.trim()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                      <Plus size={14} />
                      {addingPixel ? "Salvando..." : "Salvar pixel"}
                    </button>
                    <button onClick={() => { setShowAddPixel(false); setNewPixel({ name: "", pixelId: "", accessToken: "", testEventCode: "" }); setPixelError(null) }} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 rounded-lg transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Vincular pixel a etiquetas */}
            {pixels.length > 0 && crmLists.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Vincular pixel a etiquetas CRM</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Eventos Purchase serão enviados quando clientes desta etiqueta tiverem atendimento marcado como Pago.</p>
                </div>
                <div className="space-y-2">
                  {crmLists.map((list) => (
                    <div key={list.id} className="flex items-center gap-3 border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl px-4 py-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: list.color }} />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">{list.name}</span>
                      <select value={list.metaPixelId ?? ""} onChange={(e) => assignPixelToList(list.id, e.target.value || null)} className="border border-gray-200 dark:border-[rgba(170,85,249,0.2)] bg-white dark:bg-[#1a1a2e] text-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 max-w-[180px]">
                        <option value="" className="bg-white dark:bg-[#1a1a2e] text-gray-800 dark:text-gray-100">Sem pixel</option>
                        {pixels.map((px) => (
                          <option key={px.id} value={px.id} className="bg-white dark:bg-[#1a1a2e] text-gray-800 dark:text-gray-100">{px.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pixels.length > 0 && crmLists.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">Crie etiquetas no CRM para poder vincular pixels a elas.</p>
            )}
          </div>
        )}
      </div>

      {/* Extensão CRM */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-9 h-9 rounded-lg flex items-center justify-center">
            <Puzzle size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Extensão CRM (WhatsApp Web)</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Conecte a extensão do Chrome para registrar compras direto da conversa</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL do sistema</label>
          <input readOnly value={apiUrl} className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] dark:text-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Cole este endereço no campo &quot;URL do sistema&quot; da extensão.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Token de acesso</label>
          {crmToken ? (
            <div className="flex items-center gap-2">
              <input readOnly value={crmToken} className="flex-1 border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] dark:text-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
              <button onClick={copyCrmToken} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
                <Copy size={14} />
                {crmCopied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhum token gerado ainda.</p>
          )}
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Guarde em segredo. Quem tiver este token acessa seus dados de clientes.
          </p>
        </div>

        <button onClick={generateCrmToken} disabled={crmLoading} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <RefreshCw size={14} />
          {crmLoading ? "Gerando..." : crmToken ? "Gerar novo token" : "Gerar token"}
        </button>
      </div>
    </div>
  )
}
