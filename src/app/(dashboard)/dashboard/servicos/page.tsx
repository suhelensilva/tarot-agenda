"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, X, Package, Clock, Tag } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Service = {
  id: string
  name: string
  description: string | null
  price: number
  duration: number
  type: "ONE_TIME" | "MONTHLY" | "RECURRING"
  active: boolean
  _count: { appointments: number }
}

type FormData = {
  name: string
  description: string
  price: string
  free: boolean
  duration: string
  type: "ONE_TIME" | "MONTHLY" | "RECURRING"
}

const empty: FormData = {
  name: "",
  description: "",
  price: "",
  free: false,
  duration: "60",
  type: "ONE_TIME",
}

const typeLabel = {
  ONE_TIME: "Avulso",
  MONTHLY: "Mensal",
  RECURRING: "Recorrente",
}

const typeBadge = {
  ONE_TIME: "bg-blue-100 text-blue-700",
  MONTHLY: "bg-green-100 text-green-700",
  RECURRING: "bg-orange-100 text-orange-700",
}

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState<FormData>(empty)
  const [saving, setSaving] = useState(false)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/servicos")
    const data = await res.json()
    setServices(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchServices() }, [fetchServices])

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
    }

    const url = editing ? `/api/servicos/${editing.id}` : "/api/servicos"
    const method = editing ? "PUT" : "POST"

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    setShowForm(false)
    fetchServices()
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Desativar este serviço?")) return
    await fetch(`/api/servicos/${id}`, { method: "DELETE" })
    fetchServices()
  }

  async function handleReactivate(id: string) {
    await fetch(`/api/servicos/${id}`, { method: "PATCH" })
    fetchServices()
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm("Excluir permanentemente este serviço? Esta ação não pode ser desfeita.")) return
    await fetch(`/api/servicos/${id}?permanent=true`, { method: "DELETE" })
    fetchServices()
  }

  const active = services.filter((s) => s.active)
  const inactive = services.filter((s) => !s.active)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-500 text-sm mt-0.5">{active.length} serviço{active.length !== 1 ? "s" : ""} ativo{active.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novo serviço
        </button>
      </div>

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
          {active.length > 0 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((s) => (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                        {s.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {s.price === 0 && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                            Gratuito
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeBadge[s.type]}`}>
                          {typeLabel[s.type]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Tag size={13} className="text-gray-400" />
                        {s.price === 0
                          ? <span className="font-semibold text-green-600">Gratuito</span>
                          : <span className="font-semibold text-gray-900">{formatCurrency(s.price)}</span>
                        }
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Clock size={13} className="text-gray-400" />
                        {s.duration} min
                      </div>
                      <div className="text-sm text-gray-400">
                        {s._count.appointments} atend.
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="flex-1 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 py-1.5 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeactivate(s.id)}
                        className="flex-1 text-sm border border-red-100 text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-200 text-gray-500 ml-2 shrink-0">
                        Inativo
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleReactivate(s.id)}
                        className="flex-1 text-sm border border-purple-200 text-purple-600 hover:bg-purple-50 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Reativar
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(s.id)}
                        className="flex-1 text-sm border border-red-100 text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {editing ? "Editar serviço" : "Novo serviço"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>

                  {/* Toggle gratuito / pago */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, free: false, price: "" })}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors ${
                        !form.free
                          ? "bg-purple-600 text-white border-purple-600"
                          : "text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-600"
                      }`}
                    >
                      Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, free: true, price: "" })}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors ${
                        form.free
                          ? "bg-green-500 text-white border-green-500"
                          : "text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-600"
                      }`}
                    >
                      Gratuito
                    </button>
                  </div>

                  <input
                    required={!form.free}
                    disabled={form.free}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.free ? "" : form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    placeholder={form.free ? "Gratuito" : "0,00"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min) *</label>
                  <input
                    required
                    type="number"
                    min="1"
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
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.type === t
                          ? "bg-purple-600 text-white border-purple-600"
                          : "border-gray-200 text-gray-600 hover:border-purple-300"
                      }`}
                    >
                      {typeLabel[t]}
                    </button>
                  ))}
                </div>
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
