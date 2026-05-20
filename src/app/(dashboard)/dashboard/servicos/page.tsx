"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, X, Package, Clock, Tag, FolderOpen, Pencil, Trash2, ImageIcon, LayoutGrid, List } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Category = {
  id: string
  name: string
  services: { id: string }[]
}

type Service = {
  id: string
  name: string
  description: string | null
  price: number
  duration: number
  type: "ONE_TIME" | "MONTHLY" | "RECURRING"
  active: boolean
  imageUrl: string | null
  categoryId: string | null
  category: { id: string; name: string } | null
  _count: { appointments: number }
}

type FormData = {
  name: string
  description: string
  price: string
  free: boolean
  duration: string
  type: "ONE_TIME" | "MONTHLY" | "RECURRING"
  categoryId: string
  imageUrl: string
}

const empty: FormData = {
  name: "", description: "", price: "", free: false,
  duration: "60", type: "ONE_TIME", categoryId: "", imageUrl: "",
}

const typeLabel = { ONE_TIME: "Avulso", MONTHLY: "Mensal", RECURRING: "Recorrente" }
const typeBadge = {
  ONE_TIME: "bg-blue-100 text-blue-700",
  MONTHLY: "bg-green-100 text-green-700",
  RECURRING: "bg-orange-100 text-orange-700",
}

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Service form
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState<FormData>(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Category management
  const [showCatForm, setShowCatForm] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catName, setCatName] = useState("")
  const [savingCat, setSavingCat] = useState(false)

  // Collapsed categories
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // View mode
  const [viewMode, setViewMode] = useState<"card" | "list">("card")

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [sRes, cRes] = await Promise.all([
      fetch("/api/servicos"),
      fetch("/api/categorias"),
    ])
    const [sData, cData] = await Promise.all([sRes.json(), cRes.json()])
    setServices(Array.isArray(sData) ? sData : [])
    setCategories(Array.isArray(cData) ? cData : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Image upload ────────────────────────────────────────────────────────────

  async function handleImageUpload(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "servicos")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.url) {
        setForm((f) => ({ ...f, imageUrl: data.url }))
      } else {
        setUploadError(data.error || "Erro ao enviar foto")
      }
    } catch {
      setUploadError("Erro ao enviar foto")
    } finally {
      setUploading(false)
    }
  }

  // ── Service form ────────────────────────────────────────────────────────────

  function openNew() {
    setEditing(null)
    setForm(empty)
    setShowForm(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setForm({
      name: s.name,
      description: s.description ?? "",
      price: s.price === 0 ? "" : String(s.price),
      free: s.price === 0,
      duration: String(s.duration),
      type: s.type,
      categoryId: s.categoryId ?? "",
      imageUrl: s.imageUrl ?? "",
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: form.free ? 0 : parseFloat(form.price),
      duration: parseInt(form.duration),
      type: form.type,
      categoryId: form.categoryId || null,
      imageUrl: form.imageUrl || null,
    }
    const url = editing ? `/api/servicos/${editing.id}` : "/api/servicos"
    const method = editing ? "PUT" : "POST"
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    setSaving(false)
    setShowForm(false)
    fetchAll()
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Desativar este serviço?")) return
    await fetch(`/api/servicos/${id}`, { method: "DELETE" })
    fetchAll()
  }

  async function handleReactivate(id: string) {
    await fetch(`/api/servicos/${id}`, { method: "PATCH" })
    fetchAll()
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm("Excluir permanentemente?")) return
    await fetch(`/api/servicos/${id}?permanent=true`, { method: "DELETE" })
    fetchAll()
  }

  // ── Category form ───────────────────────────────────────────────────────────

  function openNewCat() {
    setEditingCat(null)
    setCatName("")
    setShowCatForm(true)
  }

  function openEditCat(c: Category) {
    setEditingCat(c)
    setCatName(c.name)
    setShowCatForm(true)
  }

  async function handleSaveCat(e: React.FormEvent) {
    e.preventDefault()
    setSavingCat(true)
    if (editingCat) {
      await fetch(`/api/categorias/${editingCat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName }),
      })
    } else {
      await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName }),
      })
    }
    setSavingCat(false)
    setShowCatForm(false)
    fetchAll()
  }

  async function handleDeleteCat(c: Category) {
    const msg = c.services.length > 0
      ? `Excluir categoria "${c.name}"? Os ${c.services.length} serviço(s) vinculados ficarão sem categoria.`
      : `Excluir categoria "${c.name}"?`
    if (!confirm(msg)) return
    await fetch(`/api/categorias/${c.id}`, { method: "DELETE" })
    fetchAll()
  }

  // ── Group services ──────────────────────────────────────────────────────────

  const active = services.filter((s) => s.active)
  const inactive = services.filter((s) => !s.active)

  // Group active by category
  const grouped: { id: string | null; name: string; services: Service[] }[] = []

  categories.forEach((cat) => {
    const svcs = active.filter((s) => s.categoryId === cat.id)
    if (svcs.length > 0) grouped.push({ id: cat.id, name: cat.name, services: svcs })
  })

  const uncategorized = active.filter((s) => !s.categoryId)
  if (uncategorized.length > 0) grouped.push({ id: null, name: "Sem categoria", services: uncategorized })

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const isOpen = prev[key] === false
      // Fecha tudo, e se estava fechado abre só esse
      const next: Record<string, boolean> = {}
      Object.keys(prev).forEach(k => { next[k] = true })
      if (!isOpen) next[key] = false
      return next
    })
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-500 text-sm mt-0.5">{active.length} serviço{active.length !== 1 ? "s" : ""} ativo{active.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 transition-colors ${viewMode === "card" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
              title="Cards"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
              title="Lista"
            >
              <List size={15} />
            </button>
          </div>
          <button
            onClick={openNewCat}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FolderOpen size={15} /> Nova categoria
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Novo serviço
          </button>
        </div>
      </div>


      {/* Categories chips — abas */}
      {(categories.length > 0 || uncategorized.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((c) => {
            const isOpen = collapsed[c.id] === false
            return (
              <div key={c.id} className={`group flex items-center gap-2 rounded-full px-4 py-1.5 shadow-sm transition-all cursor-pointer select-none border ${isOpen ? "bg-purple-600 border-purple-600" : "bg-white border-purple-200 hover:border-purple-400"}`}
                onClick={() => toggleCollapse(c.id)}
              >
                <span className={`text-sm font-medium ${isOpen ? "text-white" : "text-purple-600"}`}>{c.name}</span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isOpen ? "bg-white/20 text-white" : "bg-purple-100 text-purple-500"}`}>{c.services.length}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEditCat(c)} className={`p-1 rounded-full transition-colors ${isOpen ? "text-white/70 hover:text-white hover:bg-white/20" : "text-purple-400 hover:text-purple-600 hover:bg-purple-50"}`}><Pencil size={11} /></button>
                  <button onClick={() => handleDeleteCat(c)} className={`p-1 rounded-full transition-colors ${isOpen ? "text-white/70 hover:text-white hover:bg-white/20" : "text-purple-300 hover:text-red-500 hover:bg-red-50"}`}><Trash2 size={11} /></button>
                </div>
              </div>
            )
          })}
          {uncategorized.length > 0 && (
            <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 shadow-sm transition-all cursor-pointer select-none border ${collapsed["uncategorized"] === false ? "bg-purple-600 border-purple-600" : "bg-white border-purple-200 hover:border-purple-400"}`}
              onClick={() => toggleCollapse("uncategorized")}
            >
              <span className={`text-sm font-medium ${collapsed["uncategorized"] === false ? "text-white" : "text-purple-600"}`}>Sem categoria</span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${collapsed["uncategorized"] === false ? "bg-white/20 text-white" : "bg-purple-100 text-purple-500"}`}>{uncategorized.length}</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum serviço cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Cadastre seus serviços para usar nos agendamentos</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Active services grouped by category */}
          {grouped.map((group) => {
            const key = group.id ?? "uncategorized"
            const isCollapsed = collapsed[key] !== false
            if (isCollapsed) return null
            return (
              <div key={key} className="mb-6">
                <h2 className="text-base font-semibold text-gray-700 mb-4">{group.name}</h2>
                {(
                  viewMode === "card" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {group.services.map((s) => (
                        <ServiceCard key={s.id} service={s} onEdit={() => openEdit(s)} onDeactivate={() => handleDeactivate(s.id)} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {group.services.map((s) => (
                        <ServiceRow key={s.id} service={s} onEdit={() => openEdit(s)} onDeactivate={() => handleDeactivate(s.id)} />
                      ))}
                    </div>
                  )
                )}
              </div>
            )
          })}

          {/* Inactive */}
          {inactive.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-400 mb-3">Desativados</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map((s) => (
                  <div key={s.id} className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-500 truncate">{s.name}</p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {s.price === 0 ? "Gratuito" : formatCurrency(s.price)} · {s.duration} min
                        </p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-200 text-gray-500 ml-2 shrink-0">Inativo</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleReactivate(s.id)} className="flex-1 text-sm border border-purple-200 text-purple-600 hover:bg-purple-50 py-1.5 rounded-lg transition-colors font-medium">Reativar</button>
                      <button onClick={() => handlePermanentDelete(s.id)} className="flex-1 text-sm border border-red-100 text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Category modal ── */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingCat ? "Editar categoria" : "Nova categoria"}</h2>
              <button onClick={() => setShowCatForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCat} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da categoria *</label>
                <input
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: Tarot Terapêutico, Rituais..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCatForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingCat} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {savingCat ? "Salvando..." : editingCat ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Service modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">{editing ? "Editar serviço" : "Novo serviço"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">

              {/* Imagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto do serviço</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-40 aspect-square mx-auto border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-colors overflow-hidden relative"
                >
                  {form.imageUrl ? (
                    <>
                      <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                          e.stopPropagation()
                          setForm((f) => ({ ...f, imageUrl: "" }))
                          if (fileRef.current) fileRef.current.value = ""
                        }}
                          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <X size={13} /> Remover foto
                        </button>
                      </div>
                    </>
                  ) : uploading ? (
                    <p className="text-sm text-purple-500">Enviando...</p>
                  ) : (
                    <>
                      <ImageIcon size={24} className="text-gray-300 mb-1" />
                      <p className="text-xs text-gray-400">Clique para adicionar foto</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (f.size > 5 * 1024 * 1024) {
                      setUploadError("Imagem muito grande. O tamanho máximo é 5MB. Reduza e tente novamente.")
                      return
                    }
                    handleImageUpload(f)
                  }}
                />
                {uploadError && (
                  <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do serviço *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: Leitura de Amor, Mapa Astral..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  placeholder="opcional"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">— Sem categoria —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setForm({ ...form, free: false, price: "" })}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors ${!form.free ? "bg-purple-600 text-white border-purple-600" : "text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-600"}`}>
                      Pago
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, free: true, price: "" })}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors ${form.free ? "bg-green-500 text-white border-green-500" : "text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-600"}`}>
                      Gratuito
                    </button>
                  </div>
                  <input
                    required={!form.free}
                    disabled={form.free}
                    type="number" min="0" step="0.01"
                    value={form.free ? "" : form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    placeholder={form.free ? "Gratuito" : "0,00"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min) *</label>
                  <input
                    required type="number" min="1"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ONE_TIME", "MONTHLY", "RECURRING"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === t ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                      {typeLabel[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving || uploading} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {saving ? "Salvando..." : editing ? "Salvar" : "Criar serviço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ServiceRow (list view) ─────────────────────────────────────────────────────

function ServiceRow({ service: s, onEdit, onDeactivate }: {
  service: Service
  onEdit: () => void
  onDeactivate: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl flex items-center gap-4 px-4 py-3 hover:border-purple-200 hover:bg-purple-50/30 transition-colors">
      {/* Thumb */}
      {s.imageUrl ? (
        <img src={s.imageUrl} alt={s.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
          <Package size={18} className="text-purple-300" />
        </div>
      )}

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{s.name}</p>
        {s.description && <p className="text-xs text-gray-400 truncate">{s.description}</p>}
      </div>

      {/* Price */}
      <div className="shrink-0 text-sm font-semibold text-gray-900 w-24 text-right">
        {s.price === 0 ? <span className="text-green-600">Gratuito</span> : formatCurrency(s.price)}
      </div>

      {/* Duration */}
      <div className="shrink-0 flex items-center gap-1 text-sm text-gray-400 w-16">
        <Clock size={13} />
        {s.duration}min
      </div>

      {/* Type badge */}
      <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${typeBadge[s.type]}`}>
        {typeLabel[s.type]}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-purple-600 rounded-md hover:bg-purple-50 transition-colors" title="Editar">
          <Pencil size={14} />
        </button>
        <button onClick={onDeactivate} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors" title="Desativar">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── ServiceCard ────────────────────────────────────────────────────────────────

function ServiceCard({ service: s, onEdit, onDeactivate }: {
  service: Service
  onEdit: () => void
  onDeactivate: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {s.imageUrl && (
        <div className="w-full aspect-square overflow-hidden">
          <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{s.name}</p>
            {s.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>}
          </div>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {s.price === 0 && <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Gratuito</span>}
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeBadge[s.type]}`}>{typeLabel[s.type]}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Tag size={13} className="text-gray-400" />
            {s.price === 0
              ? <span className="font-semibold text-green-600">Gratuito</span>
              : <span className="font-semibold text-gray-900">{formatCurrency(s.price)}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock size={13} className="text-gray-400" />
            {s.duration} min
          </div>
          <div className="text-sm text-gray-400">{s._count.appointments} atend.</div>
        </div>

        <div className="flex gap-2">
          <button onClick={onEdit} className="flex-1 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 py-1.5 rounded-lg transition-colors">Editar</button>
          <button onClick={onDeactivate} className="flex-1 text-sm border border-red-100 text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors">Desativar</button>
        </div>
      </div>
    </div>
  )
}
