"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Search, Plus, ChevronRight, X, User, Edit2, Trash2,
  Upload, Download, CheckCircle, AlertCircle,
} from "lucide-react"
import { formatPhone, formatDate } from "@/lib/utils"
import { getPlanLimits } from "@/lib/plan"
import { PlanLimitBanner } from "@/components/plan-gate"

type Client = {
  id: string
  name: string
  phone: string
  email: string | null
  birthDate: string | null
  notes: string | null
  createdAt: string
  _count: { appointments: number }
}

type FormData = {
  name: string
  phone: string
  email: string
  birthDate: string
  notes: string
}

const empty: FormData = { name: "", phone: "", email: "", birthDate: "", notes: "" }

type ImportResult = { created: number; skipped: number } | null

export default function ClientesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const limits = getPlanLimits(session?.user?.plan)

  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<FormData>(empty)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clientes${search ? `?q=${encodeURIComponent(search)}` : ""}`)
      const data = await res.json()
      setClients(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("fetchClients error:", e)
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchClients, 300)
    return () => clearTimeout(t)
  }, [fetchClients])

  function openNew() {
    setEditing(null)
    setForm(empty)
    setShowForm(true)
  }

  function openEdit(e: React.MouseEvent, c: Client) {
    e.stopPropagation()
    setEditing(c)
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email ?? "",
      birthDate: c.birthDate ? c.birthDate.slice(0, 10) : "",
      notes: c.notes ?? "",
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const url = editing ? `/api/clientes/${editing.id}` : "/api/clientes"
    const method = editing ? "PUT" : "POST"
    try {
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      setShowForm(false)
      fetchClients()
    } catch (err) {
      console.error("handleSave error:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm("Tem certeza que quer remover este cliente? Todos os dados associados serão excluídos.")) return
    try {
      await fetch(`/api/clientes/${id}`, { method: "DELETE" })
      fetchClients()
    } catch (err) {
      console.error("handleDelete error:", err)
    }
  }

  function handleExport() {
    window.open("/api/clientes/export", "_blank")
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    setImportError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/clientes/import", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error || "Erro ao importar")
      } else {
        setImportResult(data)
        fetchClients()
      }
    } catch (err) {
      console.error("handleImportFile error:", err)
      setImportError("Erro ao importar arquivo")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-8 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-500 text-sm mt-0.5">{clients.length} cadastrado{clients.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFile}
            />
            {limits.importExport ? (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  title="Importar CSV"
                >
                  <Upload size={15} />
                  {importing ? "Importando..." : "Importar"}
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  title="Exportar CSV"
                >
                  <Download size={15} />
                  Exportar
                </button>
              </>
            ) : null}
            <button
              onClick={openNew}
              disabled={limits.clients !== -1 && clients.length >= limits.clients}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> Novo cliente
            </button>
          </div>
        </div>

        {/* Limite de plano */}
        <PlanLimitBanner current={clients.length} limit={limits.clients} entity="clientes" />

        {/* Import result toast */}
        {importResult && (
          <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            <CheckCircle size={16} className="shrink-0 text-green-600" />
            <span>
              <strong>{importResult.created}</strong> contato{importResult.created !== 1 ? "s" : ""} importado{importResult.created !== 1 ? "s" : ""}
              {importResult.skipped > 0 && ` · ${importResult.skipped} ignorado${importResult.skipped !== 1 ? "s" : ""}`}
            </span>
            <button onClick={() => setImportResult(null)} className="ml-auto text-green-600 hover:text-green-800">
              <X size={14} />
            </button>
          </div>
        )}
        {importError && (
          <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{importError}</span>
            <button onClick={() => setImportError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Carregando...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16">
            <User size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Novo cliente" para começar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/50 text-left transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500">{formatPhone(c.phone)}</p>
                </div>
                <div className="text-right shrink-0 text-xs text-gray-400">
                  <p>{c._count.appointments} atend.</p>
                  {c.birthDate && <p className="mt-0.5">{formatDate(c.birthDate)}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => openEdit(e, c)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 rounded-md hover:bg-purple-50 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, c.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editing ? "Editar cliente" : "Novo cliente"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  placeholder="Anotações sobre a cliente..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
