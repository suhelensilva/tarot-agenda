"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Copy, ExternalLink, Plus, Trash2, ChevronUp, ChevronDown,
  Link2, Calendar, Check, ImageIcon, X, Pencil,
} from "lucide-react"
import { usePlanFetch } from "@/components/upgrade-provider"

// ── Fontes ────────────────────────────────────────────────────────────────────

export const FONTS: { name: string; category: string }[] = [
  // Moderno / Sans-serif
  { name: "Poppins",           category: "Moderno"  },
  { name: "Montserrat",        category: "Moderno"  },
  { name: "Raleway",           category: "Moderno"  },
  { name: "Nunito",            category: "Moderno"  },
  { name: "DM Sans",           category: "Moderno"  },
  { name: "Plus Jakarta Sans", category: "Moderno"  },
  { name: "Outfit",            category: "Moderno"  },
  { name: "Inter",             category: "Moderno"  },
  // Clássico / Serif
  { name: "Playfair Display",  category: "Clássico" },
  { name: "Cormorant Garamond",category: "Clássico" },
  { name: "EB Garamond",       category: "Clássico" },
  { name: "Lora",              category: "Clássico" },
  { name: "Libre Baskerville", category: "Clássico" },
  { name: "Bodoni Moda",       category: "Clássico" },
  { name: "Cormorant",         category: "Clássico" },
  // Cursiva / Script
  { name: "Dancing Script",    category: "Cursiva"  },
  { name: "Pacifico",          category: "Cursiva"  },
  { name: "Great Vibes",       category: "Cursiva"  },
  { name: "Caveat",            category: "Cursiva"  },
  { name: "Satisfy",           category: "Cursiva"  },
  { name: "Sacramento",        category: "Cursiva"  },
  { name: "Pinyon Script",     category: "Cursiva"  },
  // Display / Decorativa
  { name: "Cinzel",            category: "Display"  },
  { name: "Josefin Sans",      category: "Display"  },
  { name: "Abril Fatface",     category: "Display"  },
  { name: "Bebas Neue",        category: "Display"  },
  { name: "Righteous",         category: "Display"  },
  { name: "Philosopher",       category: "Display"  },
]

// ── Temas ─────────────────────────────────────────────────────────────────────

const THEMES = [
  { id: "TEMA1", name: "Luz",    desc: "Minimalista claro",    bg: "#f5f0eb", btn: "#7c6248", btnText: "#ffffff", preview: "minimal-light"  },
  { id: "TEMA2", name: "Sombra", desc: "Dois tons escuro",     bg: "#1a1a1a", btn: "#ffffff", btnText: "#1a1a1a", preview: "two-tone-dark"   },
  { id: "TEMA3", name: "Solar",  desc: "Fundo quente vibrante",bg: "#f0e0d0", btn: "#c97d50", btnText: "#ffffff", preview: "warm-vibrant"    },
  { id: "TEMA4", name: "Cosmo",  desc: "Gráfico arrojado",     bg: "#1a2e2e", btn: "#5bbfb5", btnText: "#1a2e2e", preview: "bold-graphic"    },
  { id: "TEMA5", name: "Rosa",   desc: "Suave e feminino",     bg: "#faf0f4", btn: "#d4839a", btnText: "#ffffff", preview: "soft-feminine"   },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type PButton = { id: string; label: string; type: "BOOK" | "LINK"; url: string | null; order: number; active: boolean }
type Config  = {
  publicBio: string | null
  publicTheme: string | null
  publicFont: string | null
  publicBgColor: string | null
  publicButtonColor: string | null
  publicButtonTextColor: string | null
  publicPhotoUrl: string | null
  publicButtons: PButton[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function googleFontUrl(fonts: string[]) {
  const families = fonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700`).join("&")
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-[#aa55f9] hover:underline"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LinkPage() {
  const planFetch = usePlanFetch()

  const [userId, setUserId] = useState<string | null>(null)
  const [config, setConfig] = useState<Config>({
    publicBio: "",
    publicTheme: "TEMA1",
    publicFont: "Poppins",
    publicBgColor: null,
    publicButtonColor: null,
    publicButtonTextColor: null,
    publicPhotoUrl: null,
    publicButtons: [],
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Button form
  const [showBtnForm, setShowBtnForm] = useState(false)
  const [editingBtn, setEditingBtn] = useState<PButton | null>(null)
  const [btnLabel, setBtnLabel] = useState("")
  const [btnType, setBtnType] = useState<"BOOK" | "LINK">("LINK")
  const [btnUrl, setBtnUrl] = useState("")
  const [savingBtn, setSavingBtn] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // Load all fonts once
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = googleFontUrl(FONTS.map((f) => f.name))
    document.head.appendChild(link)
  }, [])

  // Fetch config (carrega tudo — só usar na montagem)
  const fetchConfig = useCallback(async () => {
    const r = await fetch("/api/link-page")
    const data = await r.json()
    setUserId(data.id)
    setConfig({
      publicBio:             data.publicBio             ?? "",
      publicTheme:           data.publicTheme            ?? "TEMA1",
      publicFont:            data.publicFont             ?? "Poppins",
      publicBgColor:         data.publicBgColor          ?? null,
      publicButtonColor:     data.publicButtonColor      ?? null,
      publicButtonTextColor: data.publicButtonTextColor  ?? null,
      publicPhotoUrl:        data.publicPhotoUrl         ?? null,
      publicButtons:         data.publicButtons          ?? [],
    })
  }, [])

  // Atualiza só os botões (sem sobrescrever o resto das configs)
  const fetchButtons = useCallback(async () => {
    const r = await fetch("/api/link-page/buttons")
    const data = await r.json()
    setConfig((c) => ({ ...c, publicButtons: Array.isArray(data) ? data : [] }))
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  // ── Save config ─────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    await fetch("/api/link-page", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicBio:             config.publicBio || null,
        publicTheme:           config.publicTheme,
        publicFont:            config.publicFont,
        publicBgColor:         config.publicBgColor || null,
        publicButtonColor:     config.publicButtonColor || null,
        publicButtonTextColor: config.publicButtonTextColor || null,
        publicPhotoUrl:        config.publicPhotoUrl || null,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── Photo upload ─────────────────────────────────────────────────────────────

  async function handlePhotoUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "link-page")
      const res = await planFetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.url) {
        setConfig((c) => ({ ...c, publicPhotoUrl: data.url }))
        // Salva imediatamente para não perder ao navegar
        await fetch("/api/link-page", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicPhotoUrl: data.url }),
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setUploading(false)
    }
  }

  // ── Button CRUD ──────────────────────────────────────────────────────────────

  function openNewBtn() {
    setEditingBtn(null); setBtnLabel(""); setBtnType("LINK"); setBtnUrl(""); setShowBtnForm(true)
  }
  function openEditBtn(b: PButton) {
    setEditingBtn(b); setBtnLabel(b.label); setBtnType(b.type); setBtnUrl(b.url ?? ""); setShowBtnForm(true)
  }

  async function handleSaveBtn(e: React.FormEvent) {
    e.preventDefault()
    setSavingBtn(true)
    if (editingBtn) {
      await fetch(`/api/link-page/buttons/${editingBtn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: btnLabel, type: btnType, url: btnType === "LINK" ? btnUrl || null : null }),
      })
    } else {
      await fetch("/api/link-page/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: btnLabel, type: btnType, url: btnType === "LINK" ? btnUrl || null : null }),
      })
    }
    setSavingBtn(false)
    setShowBtnForm(false)
    fetchButtons()
  }

  async function handleDeleteBtn(id: string) {
    if (!confirm("Remover botão?")) return
    await fetch(`/api/link-page/buttons/${id}`, { method: "DELETE" })
    fetchButtons()
  }

  async function handleMoveBtn(id: string, direction: "up" | "down") {
    await fetch(`/api/link-page/buttons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    })
    fetchButtons()
  }

  async function handleToggleBtn(id: string, active: boolean) {
    await fetch(`/api/link-page/buttons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    })
    fetchButtons()
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const theme = THEMES.find((t) => t.id === config.publicTheme) ?? THEMES[0]
  const publicLink = userId ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/agendar/${userId}` : ""

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Link Público</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Personalize sua página de agendamento</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          {saved ? <><Check size={15} /> Salvo!</> : saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {/* Link de compartilhamento */}
      {userId && (
        <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Seu link</p>
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] border border-gray-200 dark:border-[rgba(170,85,249,0.1)] rounded-lg px-3 py-2.5">
            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate font-mono">{publicLink}</span>
            <CopyBtn text={publicLink} />
            <a href={publicLink} target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-purple-600 dark:hover:text-[#aa55f9] transition-colors">
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      )}

      {/* ── 1. TEMA ──────────────────────────────────────────────────────────── */}
      <Section title="Tema" subtitle="Escolha o layout da sua página">
        <div className="grid grid-cols-5 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setConfig((c) => ({ ...c, publicTheme: t.id }))}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                config.publicTheme === t.id
                  ? "border-purple-500 dark:border-[#aa55f9] ring-2 ring-purple-300 dark:ring-[rgba(170,85,249,0.3)]"
                  : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] hover:border-purple-300 dark:hover:border-[rgba(170,85,249,0.4)]"
              }`}
            >
              <ThemePreview theme={t} />
              <div className="py-2 text-center">
                <p className="text-xs font-semibold text-gray-800 dark:text-white">{t.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{t.desc}</p>
              </div>
              {config.publicTheme === t.id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 dark:bg-[#aa55f9] flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* ── 2. PERFIL ────────────────────────────────────────────────────────── */}
      <Section title="Perfil" subtitle="Foto e descrição que aparecem na página">
        <div className="flex gap-5">
          {/* Photo */}
          <div className="shrink-0">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 dark:border-[rgba(170,85,249,0.25)] flex items-center justify-center cursor-pointer hover:border-purple-400 dark:hover:border-[rgba(170,85,249,0.5)] overflow-hidden relative group transition-colors"
            >
              {config.publicPhotoUrl ? (
                <>
                  <img src={config.publicPhotoUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <ImageIcon size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </>
              ) : uploading ? (
                <p className="text-xs text-purple-400">Enviando…</p>
              ) : (
                <ImageIcon size={22} className="text-gray-300 dark:text-gray-600" />
              )}
            </div>
            {config.publicPhotoUrl && (
              <button
                onClick={async () => {
                  setConfig((c) => ({ ...c, publicPhotoUrl: null }))
                  await fetch("/api/link-page", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ publicPhotoUrl: null }),
                  })
                }}
                className="mt-1.5 text-xs text-red-400 hover:text-red-500 w-full text-center"
              >Remover</button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }} />
          </div>

          {/* Bio */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio / descrição</label>
            <textarea
              rows={3}
              value={config.publicBio ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, publicBio: e.target.value }))}
              placeholder="Ex: Taróloga especialista em amor e propósito de vida ✨"
              className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] resize-none"
            />
          </div>
        </div>
      </Section>

      {/* ── 3. BOTÕES ────────────────────────────────────────────────────────── */}
      <Section title="Botões" subtitle="Adicione links e botões de agendamento">
        <div className="space-y-2 mb-3">
          {config.publicButtons.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              Nenhum botão ainda. Adicione abaixo.
            </p>
          )}
          {config.publicButtons.map((b, i) => (
            <div key={b.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
              b.active
                ? "bg-white dark:bg-[#13131f] border-gray-200 dark:border-[rgba(170,85,249,0.15)]"
                : "bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border-gray-100 dark:border-[rgba(255,255,255,0.05)] opacity-60"
            }`}>
              {/* Type icon */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                b.type === "BOOK"
                  ? "bg-purple-100 dark:bg-[rgba(170,85,249,0.15)] text-purple-600 dark:text-[#aa55f9]"
                  : "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
              }`}>
                {b.type === "BOOK" ? <Calendar size={13} /> : <Link2 size={13} />}
              </div>

              {/* Label + url */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{b.label}</p>
                {b.url && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{b.url}</p>}
                {b.type === "BOOK" && <p className="text-xs text-purple-400 dark:text-[#aa55f9]/70">Abre o agendamento</p>}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleMoveBtn(b.id, "up")} disabled={i === 0}
                  className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => handleMoveBtn(b.id, "down")} disabled={i === config.publicButtons.length - 1}
                  className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors">
                  <ChevronDown size={14} />
                </button>
                <button onClick={() => handleToggleBtn(b.id, b.active)}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                    b.active
                      ? "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      : "text-green-500 hover:text-green-600"
                  }`}>
                  {b.active ? "Ocultar" : "Mostrar"}
                </button>
                <button onClick={() => openEditBtn(b)} className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-[#aa55f9] rounded-md transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDeleteBtn(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={openNewBtn}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-[rgba(170,85,249,0.2)] text-gray-400 dark:text-gray-500 hover:border-purple-400 dark:hover:border-[rgba(170,85,249,0.5)] hover:text-purple-500 dark:hover:text-[#aa55f9] rounded-xl py-2.5 text-sm transition-colors"
        >
          <Plus size={15} /> Adicionar botão
        </button>
      </Section>

      {/* ── 4. ESTILO ────────────────────────────────────────────────────────── */}
      <Section title="Estilo" subtitle="Fonte, cores e personalização visual">

        {/* Font picker */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fonte</label>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {FONTS.map((f) => (
              <button
                key={f.name}
                onClick={() => setConfig((c) => ({ ...c, publicFont: f.name }))}
                className={`px-3 py-2 rounded-lg border text-left transition-all ${
                  config.publicFont === f.name
                    ? "border-purple-400 dark:border-[#aa55f9] bg-purple-50 dark:bg-[rgba(170,85,249,0.1)]"
                    : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] hover:border-purple-300 dark:hover:border-[rgba(170,85,249,0.3)]"
                }`}
              >
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{f.category}</p>
                <p className="text-sm text-gray-800 dark:text-white truncate"
                  style={{ fontFamily: `'${f.name}', sans-serif` }}>{f.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorField
            label="Cor de fundo da página"
            hint={`Padrão do tema: ${theme.bg}`}
            value={config.publicBgColor ?? ""}
            defaultValue={theme.bg}
            onChange={(v) => setConfig((c) => ({ ...c, publicBgColor: v || null }))}
          />
          <ColorField
            label="Cor dos botões"
            hint={`Padrão do tema: ${theme.btn}`}
            value={config.publicButtonColor ?? ""}
            defaultValue={theme.btn}
            onChange={(v) => setConfig((c) => ({ ...c, publicButtonColor: v || null }))}
          />
          <ColorField
            label="Cor do texto dos botões"
            hint={`Padrão do tema: ${theme.btnText}`}
            value={config.publicButtonTextColor ?? ""}
            defaultValue={theme.btnText}
            onChange={(v) => setConfig((c) => ({ ...c, publicButtonTextColor: v || null }))}
          />
        </div>
      </Section>

      {/* ── Button modal ─────────────────────────────────────────────────────── */}
      {showBtnForm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#13131f] dark:border dark:border-[rgba(170,85,249,0.15)] rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[rgba(170,85,249,0.1)]">
              <h2 className="font-semibold text-gray-900 dark:text-white">{editingBtn ? "Editar botão" : "Novo botão"}</h2>
              <button onClick={() => setShowBtnForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={17} /></button>
            </div>
            <form onSubmit={handleSaveBtn} className="p-5 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setBtnType("BOOK")}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      btnType === "BOOK"
                        ? "border-purple-500 bg-purple-50 dark:bg-[rgba(170,85,249,0.1)] text-purple-700 dark:text-[#aa55f9]"
                        : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 hover:border-purple-300"
                    }`}>
                    <Calendar size={14} /> Agendamento
                  </button>
                  <button type="button" onClick={() => setBtnType("LINK")}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      btnType === "LINK"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 hover:border-blue-300"
                    }`}>
                    <Link2 size={14} /> Link externo
                  </button>
                </div>
                {btnType === "BOOK" && (
                  <p className="text-xs text-purple-500 dark:text-[#aa55f9]/70 mt-1.5">
                    Abre o fluxo de agendamento com todos os seus serviços visíveis.
                  </p>
                )}
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Texto do botão *</label>
                <input required value={btnLabel} onChange={(e) => setBtnLabel(e.target.value)}
                  placeholder={btnType === "BOOK" ? "Agendar sua sessão" : "Meu Instagram"}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                />
              </div>

              {/* URL */}
              {btnType === "LINK" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL *</label>
                  <input required={btnType === "LINK"} type="url" value={btnUrl} onChange={(e) => setBtnUrl(e.target.value)}
                    placeholder="https://instagram.com/suapagina"
                    className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)]"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowBtnForm(false)}
                  className="flex-1 border border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={savingBtn}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {savingBtn ? "Salvando…" : editingBtn ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

// ── ColorField ─────────────────────────────────────────────────────────────────

function ColorField({ label, hint, value, defaultValue, onChange }: {
  label: string; hint: string; value: string; defaultValue: string; onChange: (v: string) => void
}) {
  const effective = value || defaultValue
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-9 h-9 rounded-lg border-2 border-gray-200 dark:border-[rgba(255,255,255,0.1)] overflow-hidden cursor-pointer"
            style={{ backgroundColor: effective }}
            onClick={() => document.getElementById(`color-${label}`)?.click()}
          />
          <input id={`color-${label}`} type="color" value={effective} onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </div>
        <div className="flex-1">
          <input
            type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={defaultValue}
            className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">{hint}</p>
        </div>
        {value && (
          <button onClick={() => onChange("")} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 text-xs">
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── ThemePreview (miniatura) ───────────────────────────────────────────────────

function ThemePreview({ theme }: { theme: typeof THEMES[number] }) {
  const { id, bg, btn } = theme
  return (
    <div className="w-full aspect-[9/16] flex flex-col items-center pt-3 px-2 gap-1.5 overflow-hidden"
      style={{ backgroundColor: bg }}>
      {/* Photo */}
      <div className={`shrink-0 bg-gray-300/60 ${id === "TEMA4" ? "w-full h-8 rounded-none" : "w-7 h-7 rounded-full"}`} />
      {/* Name bar */}
      <div className="w-10 h-1.5 rounded-full bg-gray-400/40" />
      {/* Buttons */}
      {[1, 2, 3].map((n) => (
        <div key={n} className={`w-full h-2.5 rounded ${id === "TEMA3" ? "rounded-full" : "rounded-md"} opacity-90`}
          style={{ backgroundColor: btn }} />
      ))}
    </div>
  )
}
