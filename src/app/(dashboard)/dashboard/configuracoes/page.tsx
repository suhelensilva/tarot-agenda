"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Link2 } from "lucide-react"

type PLink = { id: string; name: string; url: string }

export default function ConfiguracoesPage() {
  const [paymentLinks, setPaymentLinks] = useState<PLink[]>([])
  const [newLinkName, setNewLinkName] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [savingLink, setSavingLink] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/links-pagamento").then((r) => r.json()).then((d) => setPaymentLinks(Array.isArray(d) ? d : []))
  }, [])

  async function addPaymentLink() {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return
    setSavingLink(true)
    setLinkError(null)
    try {
      const res = await fetch("/api/links-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLinkName.trim(), url: newLinkUrl.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? "Erro ao salvar")
      }
      const created = await res.json()
      setPaymentLinks((prev) => [...prev, created])
      setNewLinkName("")
      setNewLinkUrl("")
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSavingLink(false)
    }
  }

  async function deletePaymentLink(id: string) {
    await fetch(`/api/links-pagamento/${id}`, { method: "DELETE" })
    setPaymentLinks((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>

      {/* Links de Pagamento */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 w-9 h-9 rounded-lg flex items-center justify-center">
            <Link2 size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Links de Pagamento</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cadastre links do Mercado Pago, PIX, ou qualquer outra cobrança</p>
          </div>
        </div>

        {paymentLinks.length > 0 && (
          <div className="space-y-2">
            {paymentLinks.map((l) => (
              <div key={l.id} className="flex items-center gap-3 border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-lg px-3 py-2.5">
                <Link2 size={14} className="text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{l.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{l.url}</p>
                </div>
                <button onClick={() => deletePaymentLink(l.id)} className="text-red-400 hover:text-red-600 shrink-0 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {paymentLinks.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhum link cadastrado ainda</p>
        )}

        <div className="border border-dashed border-gray-300 dark:border-[rgba(170,85,249,0.2)] rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Adicionar link</p>
          <input value={newLinkName} onChange={(e) => setNewLinkName(e.target.value)}
            placeholder="Nome (ex: Mercado Pago, PIX, Consulta Online)"
            className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400" />
          <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="URL (https://...)" type="url"
            className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400" />
          {linkError && <p className="text-xs text-red-500">{linkError}</p>}
          <button onClick={addPaymentLink} disabled={savingLink || !newLinkName.trim() || !newLinkUrl.trim()}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={14} />
            {savingLink ? "Salvando..." : "Adicionar link"}
          </button>
        </div>
      </div>
    </div>
  )
}
