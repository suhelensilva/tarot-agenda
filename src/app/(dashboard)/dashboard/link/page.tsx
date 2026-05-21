"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Copy, ExternalLink, Plus, Trash2, ChevronUp, ChevronDown,
  Link2, Calendar, Check, ImageIcon, X, Pencil,
} from "lucide-react"
import { usePlanFetch } from "@/components/upgrade-provider"

// ── Fontes ────────────────────────────────────────────────────────────────────

export const FONTS: { name: string; category: string }[] = [
  { name: "Poppins",            category: "Moderno"  },
  { name: "Montserrat",         category: "Moderno"  },
  { name: "Raleway",            category: "Moderno"  },
  { name: "Nunito",             category: "Moderno"  },
  { name: "DM Sans",            category: "Moderno"  },
  { name: "Plus Jakarta Sans",  category: "Moderno"  },
  { name: "Outfit",             category: "Moderno"  },
  { name: "Inter",              category: "Moderno"  },
  { name: "Playfair Display",   category: "Clássico" },
  { name: "Cormorant Garamond", category: "Clássico" },
  { name: "EB Garamond",        category: "Clássico" },
  { name: "Lora",               category: "Clássico" },
  { name: "Libre Baskerville",  category: "Clássico" },
  { name: "Bodoni Moda",        category: "Clássico" },
  { name: "Cormorant",          category: "Clássico" },
  { name: "Dancing Script",     category: "Cursiva"  },
  { name: "Pacifico",           category: "Cursiva"  },
  { name: "Great Vibes",        category: "Cursiva"  },
  { name: "Caveat",             category: "Cursiva"  },
  { name: "Satisfy",            category: "Cursiva"  },
  { name: "Sacramento",         category: "Cursiva"  },
  { name: "Pinyon Script",      category: "Cursiva"  },
  { name: "Cinzel",             category: "Display"  },
  { name: "Josefin Sans",       category: "Display"  },
  { name: "Abril Fatface",      category: "Display"  },
  { name: "Bebas Neue",         category: "Display"  },
  { name: "Righteous",          category: "Display"  },
  { name: "Philosopher",        category: "Display"  },
]

// ── Temas ─────────────────────────────────────────────────────────────────────

export const THEMES = [
  { id: "TEMA1", name: "Luz",    desc: "Minimalista claro",     bg: "#f5f0eb", btn: "#7c6248", btnText: "#ffffff" },
  { id: "TEMA2", name: "Sombra", desc: "Dois tons escuro",      bg: "#1a1a1a", btn: "#ffffff", btnText: "#1a1a1a" },
  { id: "TEMA3", name: "Solar",  desc: "Fundo quente vibrante", bg: "#f0e0d0", btn: "#c97d50", btnText: "#ffffff" },
  { id: "TEMA4", name: "Cosmo",  desc: "Gráfico arrojado",      bg: "#1a2e2e", btn: "#5bbfb5", btnText: "#1a2e2e" },
  { id: "TEMA5", name: "Rosa",   desc: "Suave e feminino",      bg: "#faf0f4", btn: "#d4839a", btnText: "#ffffff" },
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

function isLight(hex: string) {
  const h = hex.replace("#", "")
  if (h.length < 6) return true
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
  return (r*299 + g*587 + b*114)/1000 > 128
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-[#aa55f9] hover:underline">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LinkPage() {
  const planFetch = usePlanFetch()

  const [userId, setUserId]   = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [config, setConfig]   = useState<Config>({
    publicBio: "", publicTheme: "TEMA1", publicFont: "Poppins",
    publicBgColor: null, publicButtonColor: null, publicButtonTextColor: null,
    publicPhotoUrl: null, publicButtons: [],
  })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [uploading, setUploading] = useState(false)

  const [showBtnForm, setShowBtnForm] = useState(false)
  const [editingBtn, setEditingBtn]   = useState<PButton | null>(null)
  const [btnLabel, setBtnLabel]       = useState("")
  const [btnType, setBtnType]         = useState<"BOOK"|"LINK">("LINK")
  const [btnUrl, setBtnUrl]           = useState("")
  const [savingBtn, setSavingBtn]     = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // Carrega todas as fontes uma vez
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = googleFontUrl(FONTS.map((f) => f.name))
    document.head.appendChild(link)
  }, [])

  const fetchConfig = useCallback(async () => {
    const r = await fetch("/api/link-page")
    const data = await r.json()
    setUserId(data.id)
    setUserName(data.name)
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

  const fetchButtons = useCallback(async () => {
    const r = await fetch("/api/link-page/buttons")
    const data = await r.json()
    setConfig((c) => ({ ...c, publicButtons: Array.isArray(data) ? data : [] }))
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

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
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file); fd.append("folder", "link-page")
      const res  = await planFetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.url) {
        setConfig((c) => ({ ...c, publicPhotoUrl: data.url }))
        await fetch("/api/link-page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicPhotoUrl: data.url }) })
        setSaved(true); setTimeout(() => setSaved(false), 2500)
      }
    } finally { setUploading(false) }
  }

  function openNewBtn()    { setEditingBtn(null); setBtnLabel(""); setBtnType("LINK"); setBtnUrl(""); setShowBtnForm(true) }
  function openEditBtn(b: PButton) { setEditingBtn(b); setBtnLabel(b.label); setBtnType(b.type); setBtnUrl(b.url ?? ""); setShowBtnForm(true) }

  async function handleSaveBtn(e: React.FormEvent) {
    e.preventDefault(); setSavingBtn(true)
    if (editingBtn) {
      await fetch(`/api/link-page/buttons/${editingBtn.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: btnLabel, type: btnType, url: btnType === "LINK" ? btnUrl || null : null }) })
    } else {
      await fetch("/api/link-page/buttons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: btnLabel, type: btnType, url: btnType === "LINK" ? btnUrl || null : null }) })
    }
    setSavingBtn(false); setShowBtnForm(false); fetchButtons()
  }

  async function handleDeleteBtn(id: string) { if (!confirm("Remover botão?")) return; await fetch(`/api/link-page/buttons/${id}`, { method: "DELETE" }); fetchButtons() }
  async function handleMoveBtn(id: string, dir: "up"|"down") { await fetch(`/api/link-page/buttons/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direction: dir }) }); fetchButtons() }
  async function handleToggleBtn(id: string, active: boolean) { await fetch(`/api/link-page/buttons/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) }); fetchButtons() }

  const theme      = THEMES.find((t) => t.id === config.publicTheme) ?? THEMES[0]
  const publicLink = userId ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/agendar/${userId}` : ""

  return (
    <div className="flex gap-0 h-full min-h-screen">

      {/* ── Coluna esquerda: editor ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Link Público</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Personalize sua página de agendamento</p>
          </div>
          <div className="flex items-center gap-3">
            {userId && (
              <a href={publicLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-[#aa55f9] transition-colors border border-gray-200 dark:border-[rgba(255,255,255,0.08)] px-3 py-2 rounded-lg">
                <ExternalLink size={13} /> Ver página
              </a>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors">
              {saved ? <><Check size={14} /> Salvo!</> : saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        {/* Link */}
        {userId && (
          <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-4">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] border border-gray-200 dark:border-[rgba(170,85,249,0.1)] rounded-lg px-3 py-2.5">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 truncate font-mono text-xs">{publicLink}</span>
              <CopyBtn text={publicLink} />
            </div>
          </div>
        )}

        {/* ── 1. TEMA ────────────────────────────────────────────────────────── */}
        <Section title="Tema" subtitle="Escolha o layout da sua página">
          <div className="grid grid-cols-5 gap-2.5">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => setConfig((c) => ({ ...c, publicTheme: t.id }))}
                className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                  config.publicTheme === t.id
                    ? "border-purple-500 dark:border-[#aa55f9] ring-2 ring-purple-300/40 dark:ring-[rgba(170,85,249,0.3)]"
                    : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] hover:border-purple-300 dark:hover:border-[rgba(170,85,249,0.4)]"
                }`}>
                <MiniThemeCard theme={t} />
                <div className="py-1.5 text-center bg-white dark:bg-[#1a1a2e]">
                  <p className="text-xs font-semibold text-gray-800 dark:text-white">{t.name}</p>
                </div>
                {config.publicTheme === t.id && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 dark:bg-[#aa55f9] flex items-center justify-center shadow">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* ── 2. PERFIL ──────────────────────────────────────────────────────── */}
        <Section title="Perfil" subtitle="Foto e bio que aparecem na página">
          <div className="flex gap-4">
            <div className="shrink-0">
              <div onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 dark:border-[rgba(170,85,249,0.25)] flex items-center justify-center cursor-pointer hover:border-purple-400 dark:hover:border-[rgba(170,85,249,0.5)] overflow-hidden relative group transition-colors">
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
                <button onClick={async () => {
                  setConfig((c) => ({ ...c, publicPhotoUrl: null }))
                  await fetch("/api/link-page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicPhotoUrl: null }) })
                }} className="mt-1 text-xs text-red-400 hover:text-red-500 w-full text-center">Remover</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio / descrição</label>
              <textarea rows={3} value={config.publicBio ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, publicBio: e.target.value }))}
                placeholder="Ex: Taróloga especialista em amor e propósito de vida ✨"
                className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-[rgba(170,85,249,0.4)] resize-none" />
            </div>
          </div>
        </Section>

        {/* ── 3. BOTÕES ──────────────────────────────────────────────────────── */}
        <Section title="Botões" subtitle="Adicione links e botões de agendamento">
          <div className="space-y-2 mb-3">
            {config.publicButtons.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">Nenhum botão ainda.</p>
            )}
            {config.publicButtons.map((b, i) => (
              <div key={b.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${
                b.active ? "bg-white dark:bg-[#13131f] border-gray-200 dark:border-[rgba(170,85,249,0.15)]"
                         : "bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border-gray-100 dark:border-[rgba(255,255,255,0.05)] opacity-60"
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  b.type === "BOOK" ? "bg-purple-100 dark:bg-[rgba(170,85,249,0.15)] text-purple-600 dark:text-[#aa55f9]"
                                   : "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  {b.type === "BOOK" ? <Calendar size={13} /> : <Link2 size={13} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{b.label}</p>
                  {b.url && <p className="text-xs text-gray-400 truncate">{b.url}</p>}
                  {b.type === "BOOK" && <p className="text-xs text-purple-400 dark:text-[#aa55f9]/70">Abre o agendamento</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => handleMoveBtn(b.id, "up")} disabled={i === 0} className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"><ChevronUp size={13} /></button>
                  <button onClick={() => handleMoveBtn(b.id, "down")} disabled={i === config.publicButtons.length - 1} className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"><ChevronDown size={13} /></button>
                  <button onClick={() => handleToggleBtn(b.id, b.active)} className={`text-xs px-1.5 py-0.5 rounded font-medium ${b.active ? "text-gray-400 hover:text-gray-600 dark:text-gray-500" : "text-green-500"}`}>{b.active ? "Ocultar" : "Mostrar"}</button>
                  <button onClick={() => openEditBtn(b)} className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-[#aa55f9] rounded transition-colors"><Pencil size={12} /></button>
                  <button onClick={() => handleDeleteBtn(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={openNewBtn}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-[rgba(170,85,249,0.2)] text-gray-400 dark:text-gray-500 hover:border-purple-400 dark:hover:border-[rgba(170,85,249,0.5)] hover:text-purple-500 dark:hover:text-[#aa55f9] rounded-xl py-2.5 text-sm transition-colors">
            <Plus size={14} /> Adicionar botão
          </button>
        </Section>

        {/* ── 4. ESTILO ──────────────────────────────────────────────────────── */}
        <Section title="Estilo" subtitle="Fonte e cores da sua página">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fonte</label>
            <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {FONTS.map((f) => (
                <button key={f.name} onClick={() => setConfig((c) => ({ ...c, publicFont: f.name }))}
                  className={`px-2.5 py-2 rounded-lg border text-left transition-all ${
                    config.publicFont === f.name
                      ? "border-purple-400 dark:border-[#aa55f9] bg-purple-50 dark:bg-[rgba(170,85,249,0.1)]"
                      : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] hover:border-purple-300 dark:hover:border-[rgba(170,85,249,0.3)]"
                  }`}>
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-none mb-0.5">{f.category}</p>
                  <p className="text-sm text-gray-800 dark:text-white truncate leading-tight" style={{ fontFamily: `'${f.name}', sans-serif` }}>{f.name}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <ColorField label="Fundo" hint={theme.bg} value={config.publicBgColor ?? ""} defaultValue={theme.bg} onChange={(v) => setConfig((c) => ({ ...c, publicBgColor: v || null }))} />
            <ColorField label="Botões" hint={theme.btn} value={config.publicButtonColor ?? ""} defaultValue={theme.btn} onChange={(v) => setConfig((c) => ({ ...c, publicButtonColor: v || null }))} />
            <ColorField label="Texto dos botões" hint={theme.btnText} value={config.publicButtonTextColor ?? ""} defaultValue={theme.btnText} onChange={(v) => setConfig((c) => ({ ...c, publicButtonTextColor: v || null }))} />
          </div>
        </Section>

      </div>{/* fim coluna esquerda */}

      {/* ── Coluna direita: prévia ao vivo ─────────────────────────────────── */}
      <div className="hidden xl:flex w-80 shrink-0 flex-col items-center justify-start pt-8 pb-8 px-6 border-l border-gray-200 dark:border-[rgba(170,85,249,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] sticky top-0 h-screen overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-5">Prévia ao vivo</p>

        {/* Frame do celular */}
        <div className="relative w-[220px] shrink-0">
          {/* Corpo do celular */}
          <div className="rounded-[2.2rem] border-[7px] border-gray-800 dark:border-gray-700 bg-gray-800 dark:bg-gray-700 shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden">
            {/* Notch */}
            <div className="flex justify-center pt-2 pb-1 bg-gray-800 dark:bg-gray-700">
              <div className="w-14 h-4 rounded-full bg-gray-900 dark:bg-gray-600" />
            </div>
            {/* Tela */}
            <div className="overflow-hidden" style={{ height: "420px" }}>
              <div style={{ transform: "scale(0.565)", transformOrigin: "top left", width: "389px", height: "743px" }}>
                <LivePreview config={config} userName={userName} />
              </div>
            </div>
            {/* Botão home */}
            <div className="flex justify-center py-2 bg-gray-800 dark:bg-gray-700">
              <div className="w-12 h-1 rounded-full bg-gray-600 dark:bg-gray-500" />
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-4 text-center leading-relaxed">
          Prévia em tempo real.<br />Clique em <strong>Salvar</strong> para publicar.
        </p>
      </div>

      {/* ── Modal de botão ─────────────────────────────────────────────────── */}
      {showBtnForm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#13131f] dark:border dark:border-[rgba(170,85,249,0.15)] rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-[rgba(170,85,249,0.1)]">
              <h2 className="font-semibold text-gray-900 dark:text-white">{editingBtn ? "Editar botão" : "Novo botão"}</h2>
              <button onClick={() => setShowBtnForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={17} /></button>
            </div>
            <form onSubmit={handleSaveBtn} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setBtnType("BOOK")} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${btnType === "BOOK" ? "border-purple-500 bg-purple-50 dark:bg-[rgba(170,85,249,0.1)] text-purple-700 dark:text-[#aa55f9]" : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 hover:border-purple-300"}`}><Calendar size={14} /> Agendamento</button>
                  <button type="button" onClick={() => setBtnType("LINK")} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${btnType === "LINK" ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" : "border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 hover:border-blue-300"}`}><Link2 size={14} /> Link externo</button>
                </div>
                {btnType === "BOOK" && <p className="text-xs text-purple-500 dark:text-[#aa55f9]/70 mt-1.5">Abre o fluxo de agendamento com seus serviços visíveis.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Texto do botão *</label>
                <input required value={btnLabel} onChange={(e) => setBtnLabel(e.target.value)} placeholder={btnType === "BOOK" ? "Agendar sua sessão" : "Meu Instagram"}
                  className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              {btnType === "LINK" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL *</label>
                  <input required type="url" value={btnUrl} onChange={(e) => setBtnUrl(e.target.value)} placeholder="https://instagram.com/suapagina"
                    className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowBtnForm(false)} className="flex-1 border border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingBtn} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">{savingBtn ? "Salvando…" : editingBtn ? "Salvar" : "Adicionar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

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

// ── ColorField ────────────────────────────────────────────────────────────────

function ColorField({ label, hint, value, defaultValue, onChange }: { label: string; hint: string; value: string; defaultValue: string; onChange: (v: string) => void }) {
  const effective = value || defaultValue
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-[rgba(255,255,255,0.1)] cursor-pointer shadow-sm" style={{ backgroundColor: effective }} onClick={() => document.getElementById(`clr-${label}`)?.click()} />
          <input id={`clr-${label}`} type="color" value={effective} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </div>
        <div className="flex-1 min-w-0">
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={hint}
            className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-md px-2 py-1.5 text-xs font-mono text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400" />
          {value && <button onClick={() => onChange("")} className="text-[10px] text-gray-400 hover:text-red-400 mt-0.5">↩ padrão</button>}
        </div>
      </div>
    </div>
  )
}

// ── MiniThemeCard (card do seletor) ───────────────────────────────────────────

function MiniThemeCard({ theme }: { theme: typeof THEMES[number] }) {
  const { id, bg, btn } = theme
  return (
    <div className="w-full aspect-[9/14] flex flex-col items-center pt-3 px-2 gap-1.5 overflow-hidden" style={{ backgroundColor: bg }}>
      {id === "TEMA4" ? (
        <div className="w-full h-8 rounded-lg bg-gray-400/40 mb-1" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-400/40" />
      )}
      <div className="w-10 h-1.5 rounded-full bg-gray-500/30" />
      {[1, 2, 3].map((n) => (
        <div key={n} className={`w-full h-2.5 ${id === "TEMA3" || id === "TEMA5" ? "rounded-full" : "rounded"}`} style={{ backgroundColor: btn, opacity: 0.9 }} />
      ))}
    </div>
  )
}

// ── LivePreview ───────────────────────────────────────────────────────────────

function LivePreview({ config, userName }: { config: Config; userName: string | null }) {
  const theme    = THEMES.find((t) => t.id === config.publicTheme) ?? THEMES[0]
  const bg       = config.publicBgColor    || theme.bg
  const btn      = config.publicButtonColor || theme.btn
  const btnTxt   = config.publicButtonTextColor || theme.btnText
  const font     = config.publicFont ?? "Poppins"
  const name     = userName ?? "Seu Nome"
  const bio      = config.publicBio || ""
  const photo    = config.publicPhotoUrl
  const tid      = config.publicTheme ?? "TEMA1"
  const lightBg  = isLight(bg)
  const textColor = lightBg ? "#3a2a1a" : "#f0ece8"

  const visibleBtns = config.publicButtons.filter((b) => b.active)
  const previewBtns = visibleBtns.length > 0
    ? visibleBtns.slice(0, 4)
    : [{ id: "d1", label: "Agendar sessão", type: "BOOK" as const }]

  const btnRadius = tid === "TEMA3" || tid === "TEMA5" ? "9999px" : tid === "TEMA1" ? "6px" : "8px"

  const PBtn = ({ label }: { label: string }) => (
    <div className="w-full flex items-center justify-center py-2.5 text-xs font-semibold"
      style={{ backgroundColor: tid === "TEMA1" ? "transparent" : btn, color: tid === "TEMA1" ? btn : btnTxt,
               borderRadius: btnRadius, border: tid === "TEMA1" ? `1.5px solid ${btn}` : "none" }}>
      {label}
    </div>
  )

  // TEMA 2: hero layout
  if (tid === "TEMA2") return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: bg, fontFamily: `'${font}', sans-serif` }}>
      <div className="relative h-36 overflow-hidden shrink-0">
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" style={{ filter: "brightness(0.4) blur(2px)", transform: "scale(1.1)" }} />
               : <div className="w-full h-full" style={{ backgroundColor: btn, opacity: 0.25 }} />}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          {photo ? <img src={photo} alt="" className="w-16 h-16 rounded-full object-cover ring-3 shadow-lg" style={{ borderColor: bg }} />
                 : <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ring-3 shadow-lg" style={{ backgroundColor: btn, color: btnTxt, borderColor: bg }}>{name[0]?.toUpperCase()}</div>}
        </div>
      </div>
      <div className="pt-12 px-5 pb-4 text-center">
        <p className="text-lg font-bold" style={{ color: textColor }}>{name}</p>
        {bio && <p className="text-xs mt-1 opacity-60 line-clamp-2" style={{ color: textColor }}>{bio}</p>}
      </div>
      <div className="px-5 space-y-2">{previewBtns.map((b) => <PBtn key={b.id} label={b.label} />)}</div>
    </div>
  )

  // TEMA 4: graphic layout
  if (tid === "TEMA4") return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: bg, fontFamily: `'${font}', sans-serif` }}>
      <div className="relative mx-4 mt-5 rounded-xl overflow-hidden h-44 shrink-0">
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" />
               : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: btn + "30" }}><span className="text-4xl opacity-40">🔮</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
          <p className="text-lg font-bold text-white">{name}</p>
          {bio && <p className="text-xs text-white/60 line-clamp-1">{bio}</p>}
        </div>
      </div>
      <div className="flex justify-center gap-2 py-3 opacity-40">{["✦","✦","✦"].map((s,i) => <span key={i} className="text-xs" style={{ color: btn }}>{s}</span>)}</div>
      <div className="px-4 space-y-2">
        {previewBtns.map((b) => (
          <div key={b.id} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold"
            style={{ backgroundColor: btn + "22", color: textColor, borderRadius: btnRadius, border: `1px solid ${btn}44` }}>
            <span style={{ color: btn }} className="text-xs">✦</span>{b.label}
          </div>
        ))}
      </div>
    </div>
  )

  // TEMA 3: solar layout
  if (tid === "TEMA3") return (
    <div className="flex flex-col items-center px-5 pt-8 pb-6 min-h-full gap-4" style={{ backgroundColor: bg, fontFamily: `'${font}', sans-serif` }}>
      {photo ? <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover shadow-lg ring-4 ring-white/40 shrink-0" />
             : <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0" style={{ backgroundColor: btn + "33", color: btn }}>{name[0]?.toUpperCase()}</div>}
      <div className="text-center">
        <p className="text-xl font-bold" style={{ color: textColor }}>Olá, sou {name.split(" ")[0]}</p>
        {bio && <p className="text-xs mt-1 opacity-70 line-clamp-2 max-w-xs" style={{ color: textColor }}>{bio}</p>}
      </div>
      <div className="w-full space-y-2">{previewBtns.map((b) => <PBtn key={b.id} label={b.label} />)}</div>
    </div>
  )

  // TEMA 5: rosa layout
  if (tid === "TEMA5") return (
    <div className="flex flex-col items-center px-5 pt-8 pb-6 min-h-full gap-4" style={{ backgroundColor: bg, fontFamily: `'${font}', sans-serif` }}>
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-full scale-110 border-2 opacity-25" style={{ borderColor: btn }} />
        {photo ? <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover shadow-md" />
               : <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: btn + "33", color: btn }}>{name[0]?.toUpperCase()}</div>}
      </div>
      <div className="text-center">
        <p className="text-xl font-semibold" style={{ color: textColor }}>{name}</p>
        {bio && <p className="text-xs mt-1 opacity-70 line-clamp-2" style={{ color: textColor }}>{bio}</p>}
      </div>
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-px opacity-20" style={{ backgroundColor: btn }} />
        <span className="text-xs opacity-50" style={{ color: btn }}>✿</span>
        <div className="flex-1 h-px opacity-20" style={{ backgroundColor: btn }} />
      </div>
      <div className="w-full space-y-2">{previewBtns.map((b) => <PBtn key={b.id} label={b.label} />)}</div>
    </div>
  )

  // TEMA 1 (default): minimal light
  return (
    <div className="flex flex-col items-center px-5 pt-8 pb-6 min-h-full gap-4" style={{ backgroundColor: bg, fontFamily: `'${font}', sans-serif` }}>
      {photo ? <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover shadow-md ring-4 ring-white/60 shrink-0" />
             : <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0" style={{ backgroundColor: btn + "22", color: btn }}>{name[0]?.toUpperCase()}</div>}
      <div className="text-center">
        <p className="text-xl font-bold" style={{ color: textColor }}>{name}</p>
        {bio && <p className="text-xs mt-1 opacity-70 line-clamp-2" style={{ color: textColor }}>{bio}</p>}
      </div>
      <div className="w-full h-px opacity-15" style={{ backgroundColor: textColor }} />
      <div className="w-full space-y-2">{previewBtns.map((b) => <PBtn key={b.id} label={b.label} />)}</div>
    </div>
  )
}
