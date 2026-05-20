"use client"

import { useEffect, useState, useRef } from "react"
import { Smartphone, Calendar, Save, CheckCircle, ImageIcon, User, Crown, Lock } from "lucide-react"
import { useSession } from "next-auth/react"
import { getPlanLimits } from "@/lib/plan"
import Link from "next/link"

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

type DayAvail = { dayOfWeek: number; startTime: string; endTime: string; active: boolean; lunchStart: string | null; lunchEnd: string | null }
type Profile = {
  name: string
  logoUrl: string | null
  reportBg: string | null
  signature: string
  slogan: string
  reportTitleFont: string
  reportTitleColor: string
  reportSignatureFont: string
  reportSignatureColor: string
  reportFont: string
  reportTextColor: string
  reportAccentColor: string
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession()
  const isPremium = getPlanLimits(session?.user?.plan).marcaRelatorio
  const [availability, setAvailability] = useState<DayAvail[]>([])
  const [savingAvail, setSavingAvail] = useState(false)
  const [savedAvail, setSavedAvail] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>({
    name: "", logoUrl: null, reportBg: null,
    signature: "", slogan: "",
    reportTitleFont: "Georgia, serif",
    reportTitleColor: "#4a1d96",
    reportSignatureFont: "Georgia, serif",
    reportSignatureColor: "#7c3aed",
    reportFont: "Georgia, serif",
    reportTextColor: "#374151",
    reportAccentColor: "#7c3aed",
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/configuracoes/disponibilidade").then((r) => r.json()).then(setAvailability)
    fetch("/api/perfil").then((r) => r.json()).then((d) => setProfile({
      name: d.name ?? "",
      logoUrl: d.logoUrl,
      reportBg: d.reportBg,
      signature: d.signature ?? "",
      slogan: d.slogan ?? "",
      reportTitleFont: d.reportTitleFont ?? "Georgia, serif",
      reportTitleColor: d.reportTitleColor ?? "#4a1d96",
      reportSignatureFont: d.reportSignatureFont ?? "Georgia, serif",
      reportSignatureColor: d.reportSignatureColor ?? "#7c3aed",
      reportFont: d.reportFont ?? "Georgia, serif",
      reportTextColor: d.reportTextColor ?? "#374151",
      reportAccentColor: d.reportAccentColor ?? "#7c3aed",
    }))
  }, [])

  function handleImageUpload(field: "logoUrl" | "reportBg", file: File) {
    const reader = new FileReader()
    reader.onload = (e) => setProfile((p) => ({ ...p, [field]: e.target?.result as string }))
    reader.readAsDataURL(file)
  }

  async function saveProfile() {
    setSavingProfile(true)
    setProfileError(null)
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? `Erro ${res.status}`)
      }
      setSavedProfile(true)
      setTimeout(() => setSavedProfile(false), 2000)
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Erro ao salvar perfil")
    } finally {
      setSavingProfile(false)
    }
  }

  function updateDay(dayOfWeek: number, field: keyof DayAvail, value: string | boolean) {
    setAvailability((prev) => prev.map((d) => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
  }

  async function saveAvailability() {
    setSavingAvail(true)
    await fetch("/api/configuracoes/disponibilidade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(availability),
    })
    setSavingAvail(false)
    setSavedAvail(true)
    setTimeout(() => setSavedAvail(false), 2000)
  }

  async function connectWhatsapp() {
    setWhatsappStatus("connecting")
    setQrCode(null)
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" })
      const data = await res.json()
      if (data.qrCode) setQrCode(data.qrCode)
      else if (data.connected) setWhatsappStatus("connected")
    } catch {
      setWhatsappStatus("disconnected")
    }
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>

      {/* Perfil — Logo e Fundo (Premium) */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6 space-y-5 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-purple-50 text-purple-600 w-9 h-9 rounded-lg flex items-center justify-center">
            <User size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Marca & Identidade Visual</h2>
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Crown size={10} /> Premium
              </span>
            </div>
            <p className="text-sm text-gray-500">Logo, cores e fontes dos relatórios e fichas</p>
          </div>
        </div>

        {/* Conteúdo — bloqueado se não for Premium */}
        {!isPremium ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-3">
              <Lock size={22} className="text-purple-500" />
            </div>
            <p className="font-semibold text-gray-900 mb-1">Recurso Premium</p>
            <p className="text-sm text-gray-500 max-w-xs mb-4">
              Personalize seus relatórios com logo, cores e fontes da sua marca. Disponível no plano Premium.
            </p>
            <Link
              href="/dashboard/assinatura"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <Crown size={14} /> Ver plano Premium
            </Link>
          </div>
        ) : (
          <>
            {/* Logo */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Logo <span className="text-gray-400 font-normal">(aparece no canto esquerdo de fichas e relatórios)</span></p>
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload("logoUrl", e.target.files[0])} />
              {profile.logoUrl ? (
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.logoUrl} alt="Logo" className="h-16 w-auto object-contain border border-gray-200 rounded-lg p-1" />
                  <div className="flex flex-col gap-1">
                    <button onClick={() => logoRef.current?.click()} className="text-sm text-purple-600 hover:text-purple-500 font-medium">Trocar logo</button>
                    <button onClick={() => setProfile((p) => ({ ...p, logoUrl: null }))} className="text-sm text-red-500 hover:text-red-700">Remover</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => logoRef.current?.click()}
                  className="flex items-center gap-2 border-2 border-dashed border-gray-200 hover:border-purple-300 rounded-xl px-6 py-4 text-sm text-gray-400 hover:text-purple-500 transition-colors w-full">
                  <ImageIcon size={16} /> Clique para adicionar sua logo
                </button>
              )}
            </div>

            {/* Fundo padrão dos relatórios */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Fundo padrão dos relatórios <span className="text-gray-400 font-normal">(imagem A4 do Canva)</span></p>
              <p className="text-xs text-gray-400 mb-2">Uma vez definido, será usado em todos os relatórios. Você pode remover por relatório individualmente.</p>
              <input ref={bgRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload("reportBg", e.target.files[0])} />
              {profile.reportBg ? (
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.reportBg} alt="Fundo" className="h-20 w-auto object-contain border border-gray-200 rounded-lg" />
                  <div className="flex flex-col gap-1">
                    <button onClick={() => bgRef.current?.click()} className="text-sm text-purple-600 hover:text-purple-500 font-medium">Trocar fundo</button>
                    <button onClick={() => setProfile((p) => ({ ...p, reportBg: null }))} className="text-sm text-red-500 hover:text-red-700">Remover padrão</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => bgRef.current?.click()}
                  className="flex items-center gap-2 border-2 border-dashed border-gray-200 hover:border-purple-300 rounded-xl px-6 py-4 text-sm text-gray-400 hover:text-purple-500 transition-colors w-full">
                  <ImageIcon size={16} /> Clique para adicionar fundo A4
                </button>
              )}
            </div>

            {/* Identidade do relatório */}
            <div className="mt-2 border border-gray-200 rounded-xl p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700">✍️ Identidade do relatório</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assinatura (nome que aparece no rodapé)</label>
                <input value={profile.signature} onChange={(e) => setProfile({ ...profile, signature: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: Suelen Silva | Luz e Alma Terapias" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slogan (subtítulo no relatório)</label>
                <input value={profile.slogan} onChange={(e) => setProfile({ ...profile, slogan: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: Leituras com amor e luz" />
              </div>

              <p className="text-sm font-medium text-gray-700 pt-1">Fontes e cores</p>

              <ConfigFontColorRow
                label="Título"
                hint="Nome da cliente + cabeçalho «Relatório de Atendimento»"
                fontValue={profile.reportTitleFont}
                onFontChange={(v) => setProfile({ ...profile, reportTitleFont: v })}
                colorValue={profile.reportTitleColor}
                onColorChange={(v) => setProfile({ ...profile, reportTitleColor: v })}
              />

              <ConfigFontColorRow
                label="Assinatura / Marca"
                hint="Rodapé «Com Carinho + nome da terapeuta»"
                fontValue={profile.reportSignatureFont}
                onFontChange={(v) => setProfile({ ...profile, reportSignatureFont: v })}
                colorValue={profile.reportSignatureColor}
                onColorChange={(v) => setProfile({ ...profile, reportSignatureColor: v })}
              />

              <ConfigFontColorRow
                label="Corpo do texto"
                hint="Perguntas (subtítulos em negrito) e parágrafos"
                fontValue={profile.reportFont}
                onFontChange={(v) => setProfile({ ...profile, reportFont: v })}
                colorValue={profile.reportTextColor}
                onColorChange={(v) => setProfile({ ...profile, reportTextColor: v })}
              />

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cor de destaque <span className="text-gray-400 font-normal">(seções, divisórias)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input type="color" value={profile.reportAccentColor} onChange={(e) => setProfile({ ...profile, reportAccentColor: e.target.value })}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-200 p-0.5" />
                  <span className="text-xs text-gray-400 font-mono">{profile.reportAccentColor}</span>
                </div>
              </div>
            </div>

            {profileError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{profileError}</p>
            )}
            <button onClick={saveProfile} disabled={savingProfile}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              <Save size={15} />
              {savingProfile ? "Salvando..." : savedProfile ? "✓ Salvo!" : "Salvar perfil"}
            </button>
          </>
        )}
      </div>

      {/* WhatsApp */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-50 text-green-600 w-9 h-9 rounded-lg flex items-center justify-center">
            <Smartphone size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">WhatsApp Business</h2>
            <p className="text-sm text-gray-500">Conecte seu WhatsApp para envio de lembretes automáticos</p>
          </div>
        </div>

        {whatsappStatus === "connected" ? (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle size={18} />
            WhatsApp conectado
          </div>
        ) : whatsappStatus === "connecting" && qrCode ? (
          <div>
            <p className="text-sm text-gray-600 mb-3">Escaneie o QR Code com seu WhatsApp Business:</p>
            <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 border border-gray-200 rounded-lg" />
            <p className="text-xs text-gray-400 mt-2">Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Ao conectar, os alertas automáticos serão enviados pelo seu número de WhatsApp Business.
              <br />
              <span className="text-amber-600 font-medium">⚠ Requer Evolution API configurada no seu servidor.</span>
            </p>
            <button
              onClick={connectWhatsapp}
              disabled={whatsappStatus === "connecting"}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              <Smartphone size={15} />
              {whatsappStatus === "connecting" ? "Conectando..." : "Conectar WhatsApp"}
            </button>
          </div>
        )}
      </div>

      {/* Disponibilidade */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-50 text-purple-600 w-9 h-9 rounded-lg flex items-center justify-center">
            <Calendar size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Horários disponíveis</h2>
            <p className="text-sm text-gray-500">Defina os dias e horários que aparecem no link público de agendamento</p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {availability.map((day) => (
            <div key={day.dayOfWeek} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${day.active ? "bg-gray-50" : "opacity-40"}`}>
              {/* Toggle ativo */}
              <div
                onClick={() => updateDay(day.dayOfWeek, "active", !day.active)}
                className={`w-9 h-5 rounded-full cursor-pointer transition-colors shrink-0 ${day.active ? "bg-purple-500" : "bg-gray-200"}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow mt-[3px] transition-transform ${day.active ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
              </div>

              {/* Nome do dia */}
              <span className="text-sm font-medium text-gray-700 w-16 shrink-0">{DAYS[day.dayOfWeek]}</span>

              {/* Horários */}
              <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                <input type="time" value={day.startTime}
                  onChange={(e) => updateDay(day.dayOfWeek, "startTime", e.target.value)}
                  disabled={!day.active}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-40" />
                <span className="text-gray-400 text-xs">até</span>

                {day.lunchStart ? (
                  <>
                    {/* Pausa: endTime do manhã é o lunchStart */}
                    <input type="time" value={day.lunchStart}
                      onChange={(e) => updateDay(day.dayOfWeek, "lunchStart", e.target.value)}
                      disabled={!day.active}
                      className="border border-orange-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-40" />
                    <span className="text-orange-400 text-sm" title="Intervalo">☕</span>
                    <input type="time" value={day.lunchEnd ?? "13:00"}
                      onChange={(e) => updateDay(day.dayOfWeek, "lunchEnd", e.target.value)}
                      disabled={!day.active}
                      className="border border-orange-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-40" />
                    <span className="text-gray-400 text-xs">até</span>
                  </>
                ) : null}

                <input type="time" value={day.endTime}
                  onChange={(e) => updateDay(day.dayOfWeek, "endTime", e.target.value)}
                  disabled={!day.active}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-40" />
              </div>

              {/* Botão intervalo */}
              <button type="button" disabled={!day.active}
                onClick={() => {
                  if (day.lunchStart) {
                    setAvailability((prev) => prev.map((d) => d.dayOfWeek === day.dayOfWeek ? { ...d, lunchStart: null, lunchEnd: null } : d))
                  } else {
                    setAvailability((prev) => prev.map((d) => d.dayOfWeek === day.dayOfWeek ? { ...d, lunchStart: "12:00", lunchEnd: "13:00" } : d))
                  }
                }}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-40 ${day.lunchStart ? "bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100" : "border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500"}`}
              >
                {day.lunchStart ? "– pausa" : "+ pausa"}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={saveAvailability}
          disabled={savingAvail}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Save size={15} />
          {savingAvail ? "Salvando..." : savedAvail ? "Salvo!" : "Salvar disponibilidade"}
        </button>
      </div>
    </div>
  )
}

// ─── ConfigFontColorRow ────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  { value: "Georgia, serif", label: "Georgia (elegante)" },
  { value: "Palatino Linotype, Palatino, serif", label: "Palatino (clássica)" },
  { value: "Garamond, serif", label: "Garamond (refinada)" },
  { value: "Trebuchet MS, sans-serif", label: "Trebuchet (arredondada)" },
  { value: "Arial, sans-serif", label: "Arial (moderna)" },
  { value: "Brush Script MT, cursive", label: "Brush Script (manuscrita)" },
]

function ConfigFontColorRow({
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
