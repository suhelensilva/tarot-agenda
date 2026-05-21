"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Calendar, Clock, CheckCircle, X, ChevronLeft, ExternalLink } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type Service      = { id: string; name: string; price: number; duration: number }
type Availability = { dayOfWeek: number; startTime: string; endTime: string; active: boolean }
type PButton      = { id: string; label: string; type: "BOOK" | "LINK"; url: string | null }

type PageData = {
  id: string
  name: string | null
  publicBio: string | null
  publicTheme: string | null
  publicFont: string | null
  publicBgColor: string | null
  publicButtonColor: string | null
  publicButtonTextColor: string | null
  publicPhotoUrl: string | null
  publicButtons: PButton[]
  services: Service[]
  availability: Availability[]
}

// ── Theme config ──────────────────────────────────────────────────────────────

const THEME_DEFAULTS: Record<string, { bg: string; btn: string; btnText: string; btnRadius: string; photoBg: string }> = {
  TEMA1: { bg: "#f5f0eb", btn: "#7c6248", btnText: "#ffffff", btnRadius: "0.5rem",  photoBg: "#d9cfc5" },
  TEMA2: { bg: "#1a1a1a", btn: "#ffffff", btnText: "#1a1a1a", btnRadius: "9999px",  photoBg: "#333"    },
  TEMA3: { bg: "#f0e0d0", btn: "#c97d50", btnText: "#ffffff", btnRadius: "9999px",  photoBg: "#ddc4b0" },
  TEMA4: { bg: "#1a2e2e", btn: "#5bbfb5", btnText: "#1a2e2e", btnRadius: "0.5rem",  photoBg: "#2a3e3e" },
  TEMA5: { bg: "#faf0f4", btn: "#d4839a", btnText: "#ffffff", btnRadius: "9999px",  photoBg: "#f0d5df" },
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

const DAYS   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

function generateSlots(start: string, end: string, duration: number) {
  const slots: string[] = []
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  let cur = sh * 60 + sm
  const endMin = eh * 60 + em
  while (cur + duration <= endMin) {
    const h = Math.floor(cur / 60), m = cur % 60
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`)
    cur += duration
  }
  return slots
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgendarPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<PageData | null>(null)
  const [showBooking, setShowBooking] = useState(false)

  useEffect(() => {
    fetch(`/api/agendar/${slug}`).then((r) => r.json()).then(setData)
  }, [slug])

  // Inject Google Font
  useEffect(() => {
    if (!data?.publicFont) return
    const existing = document.querySelector(`[data-pg-font]`)
    if (existing) existing.remove()
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.setAttribute("data-pg-font", "1")
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(data.publicFont)}:wght@400;500;600;700&display=swap`
    document.head.appendChild(link)
  }, [data?.publicFont])

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
    </div>
  )

  const themeId   = data.publicTheme ?? "TEMA1"
  const defaults  = THEME_DEFAULTS[themeId] ?? THEME_DEFAULTS.TEMA1
  const bgColor   = data.publicBgColor      || defaults.bg
  const btnColor  = data.publicButtonColor  || defaults.btn
  const btnText   = data.publicButtonTextColor || defaults.btnText
  const btnRadius = defaults.btnRadius
  const font      = data.publicFont ?? "Poppins"

  // Decide which buttons to show
  const buttons = data.publicButtons.length > 0
    ? data.publicButtons
    : [{ id: "__default__", label: "Agendar sessão", type: "BOOK" as const, url: null }]

  function handleButtonClick(b: PButton) {
    if (b.type === "BOOK") { setShowBooking(true) }
    else if (b.url) { window.open(b.url, "_blank", "noopener,noreferrer") }
  }

  const pageStyle = { fontFamily: `'${font}', sans-serif`, backgroundColor: bgColor }

  return (
    <>
      {/* Desktop wrapper */}
      <div className="min-h-screen flex items-center justify-center py-10 px-4"
        style={{ backgroundColor: "#0f0f1a", backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 60%)" }}>

        {/* Phone card */}
        <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)]" style={pageStyle}>
          {themeId === "TEMA1" && <Tema1 data={data} bgColor={bgColor} btnColor={btnColor} btnText={btnText} btnRadius={btnRadius} buttons={buttons} onBtn={handleButtonClick} />}
          {themeId === "TEMA2" && <Tema2 data={data} bgColor={bgColor} btnColor={btnColor} btnText={btnText} btnRadius={btnRadius} buttons={buttons} onBtn={handleButtonClick} />}
          {themeId === "TEMA3" && <Tema3 data={data} bgColor={bgColor} btnColor={btnColor} btnText={btnText} btnRadius={btnRadius} buttons={buttons} onBtn={handleButtonClick} />}
          {themeId === "TEMA4" && <Tema4 data={data} bgColor={bgColor} btnColor={btnColor} btnText={btnText} btnRadius={btnRadius} buttons={buttons} onBtn={handleButtonClick} />}
          {themeId === "TEMA5" && <Tema5 data={data} bgColor={bgColor} btnColor={btnColor} btnText={btnText} btnRadius={btnRadius} buttons={buttons} onBtn={handleButtonClick} />}
        </div>
      </div>

      {/* Booking modal */}
      {showBooking && (
        <BookingModal data={data} font={font} onClose={() => setShowBooking(false)} />
      )}
    </>
  )
}

// ── Shared button component ───────────────────────────────────────────────────

function PubButton({ label, type, btnColor, btnText, btnRadius, onClick }: {
  label: string; type: "BOOK" | "LINK"; btnColor: string; btnText: string; btnRadius: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all active:scale-[0.98] hover:brightness-110"
      style={{ backgroundColor: btnColor, color: btnText, borderRadius: btnRadius }}
    >
      {type === "LINK" && <ExternalLink size={13} style={{ color: btnText }} />}
      {label}
    </button>
  )
}

// ── Theme props type ──────────────────────────────────────────────────────────

type ThemeProps = {
  data: PageData
  bgColor: string
  btnColor: string
  btnText: string
  btnRadius: string
  buttons: PButton[]
  onBtn: (b: PButton) => void
}

// ── TEMA 1 — Luz (Minimal, cream) ─────────────────────────────────────────────

function Tema1({ data, btnColor, btnText, btnRadius, buttons, onBtn }: ThemeProps) {
  const nameColor = useContrastColor(btnColor, "#4a3728", "#f5f0eb")
  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-8 gap-4 min-h-[600px]">
      {/* Photo */}
      {data.publicPhotoUrl ? (
        <img src={data.publicPhotoUrl} alt={data.name ?? ""} className="w-24 h-24 rounded-full object-cover shadow-md ring-4 ring-white/60" />
      ) : (
        <div className="w-24 h-24 rounded-full bg-[rgba(0,0,0,0.1)] flex items-center justify-center text-3xl font-bold" style={{ color: btnColor }}>
          {data.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}

      {/* Name + bio */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: nameColor }}>{data.name}</h1>
        {data.publicBio && <p className="text-sm mt-1.5 leading-relaxed opacity-70" style={{ color: nameColor }}>{data.publicBio}</p>}
      </div>

      {/* Divider */}
      <div className="w-full h-px opacity-20" style={{ backgroundColor: nameColor }} />

      {/* Buttons */}
      <div className="w-full space-y-2.5">
        {buttons.map((b) => (
          <button
            key={b.id}
            onClick={() => onBtn(b)}
            className="w-full py-3 text-sm font-semibold border-2 tracking-wide uppercase transition-all active:scale-[0.98] hover:opacity-80 flex items-center justify-center gap-2"
            style={{ borderColor: btnColor, color: btnColor, borderRadius: btnRadius, background: "transparent" }}
          >
            {b.type === "LINK" && <ExternalLink size={12} />}
            {b.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── TEMA 2 — Sombra (Two-tone dark) ──────────────────────────────────────────

function Tema2({ data, bgColor, btnColor, btnText, btnRadius, buttons, onBtn }: ThemeProps) {
  const isLight = isLightColor(bgColor)
  const textColor = isLight ? "#1a1a1a" : "#ffffff"
  return (
    <div className="flex flex-col min-h-[620px]" style={{ backgroundColor: bgColor }}>
      {/* Hero top */}
      <div className="relative h-44 overflow-hidden">
        {data.publicPhotoUrl ? (
          <img src={data.publicPhotoUrl} alt="" className="w-full h-full object-cover" style={{ filter: "brightness(0.45) blur(2px)", transform: "scale(1.1)" }} />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: btnColor, opacity: 0.3 }} />
        )}
        {/* Overlap photo */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          {data.publicPhotoUrl ? (
            <img src={data.publicPhotoUrl} alt={data.name ?? ""} className="w-20 h-20 rounded-full object-cover ring-4 shadow-xl" style={{ borderColor: bgColor }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center ring-4 text-2xl font-bold shadow-xl" style={{ backgroundColor: btnColor, color: btnText, borderColor: bgColor }}>
              {data.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      </div>

      {/* Name + bio */}
      <div className="pt-14 pb-4 px-6 text-center">
        <h1 className="text-3xl font-bold" style={{ color: textColor }}>{data.name}</h1>
        {data.publicBio && <p className="text-sm mt-2 leading-relaxed opacity-60" style={{ color: textColor }}>{data.publicBio}</p>}
      </div>

      {/* Buttons */}
      <div className="px-6 pb-8 space-y-3 mt-auto">
        {buttons.map((b) => (
          <PubButton key={b.id} label={b.label} type={b.type} btnColor={btnColor} btnText={btnText} btnRadius={btnRadius} onClick={() => onBtn(b)} />
        ))}
      </div>
    </div>
  )
}

// ── TEMA 3 — Solar (Warm bg, pill buttons) ────────────────────────────────────

function Tema3({ data, bgColor, btnColor, btnText, buttons, onBtn }: ThemeProps) {
  const isLight = isLightColor(bgColor)
  const textColor = isLight ? "#3d2c1e" : "#fff8f0"
  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-10 gap-5 min-h-[600px]" style={{ backgroundColor: bgColor }}>
      {/* Photo */}
      {data.publicPhotoUrl ? (
        <img src={data.publicPhotoUrl} alt={data.name ?? ""} className="w-28 h-28 rounded-full object-cover shadow-xl ring-4 ring-white/50" />
      ) : (
        <div className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold shadow-xl" style={{ backgroundColor: btnColor + "33", color: btnColor }}>
          {data.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}

      {/* Greeting */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: textColor }}>
          Olá, sou {data.name?.split(" ")[0] ?? data.name}
        </h1>
        {data.publicBio && (
          <p className="text-sm mt-2 leading-relaxed max-w-xs mx-auto" style={{ color: textColor, opacity: 0.75 }}>{data.publicBio}</p>
        )}
      </div>

      {/* Pill buttons */}
      <div className="w-full space-y-3">
        {buttons.map((b) => (
          <button
            key={b.id}
            onClick={() => onBtn(b)}
            className="w-full py-3.5 text-sm font-semibold rounded-full transition-all active:scale-[0.97] hover:brightness-105 shadow-md flex items-center justify-center gap-2"
            style={{ backgroundColor: btnColor, color: btnText }}
          >
            {b.type === "LINK" && <ExternalLink size={13} style={{ color: btnText }} />}
            {b.label}
          </button>
        ))}
      </div>

      {/* @handle / name */}
      <p className="text-xs font-medium mt-auto opacity-40" style={{ color: textColor }}>@{data.name?.toLowerCase().replace(/\s+/g, "")}</p>
    </div>
  )
}

// ── TEMA 4 — Cosmo (Bold, dark graphic) ──────────────────────────────────────

function Tema4({ data, bgColor, btnColor, btnText, btnRadius, buttons, onBtn }: ThemeProps) {
  const textColor = isLightColor(bgColor) ? "#0f1f1f" : "#e8f5f3"
  return (
    <div className="flex flex-col min-h-[620px]" style={{ backgroundColor: bgColor }}>
      {/* Card hero */}
      <div className="relative mx-5 mt-6 rounded-2xl overflow-hidden h-52">
        {data.publicPhotoUrl ? (
          <img src={data.publicPhotoUrl} alt={data.name ?? ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: btnColor + "40" }}>
            <span className="text-6xl opacity-40">🔮</span>
          </div>
        )}
        {/* Gradient overlay + name */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">{data.name}</h1>
          {data.publicBio && <p className="text-xs text-white/70 mt-0.5 line-clamp-2">{data.publicBio}</p>}
        </div>
      </div>

      {/* Sparkle row */}
      <div className="flex items-center justify-center gap-3 py-4 opacity-40">
        {["✦","✦","✦","✦","✦"].map((s, i) => <span key={i} className="text-sm" style={{ color: btnColor }}>{s}</span>)}
      </div>

      {/* Buttons */}
      <div className="px-5 pb-8 space-y-2.5">
        {buttons.map((b) => (
          <button
            key={b.id}
            onClick={() => onBtn(b)}
            className="w-full py-3 text-sm font-semibold tracking-wide transition-all active:scale-[0.98] hover:brightness-110 flex items-center justify-center gap-2"
            style={{ backgroundColor: btnColor + "22", color: textColor, borderRadius: btnRadius, border: `1px solid ${btnColor}55` }}
          >
            <span style={{ color: btnColor }}>✦</span>
            {b.label}
            {b.type === "LINK" && <ExternalLink size={12} style={{ color: btnColor }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── TEMA 5 — Rosa (Soft, feminine) ───────────────────────────────────────────

function Tema5({ data, bgColor, btnColor, btnText, btnRadius, buttons, onBtn }: ThemeProps) {
  const isLight = isLightColor(bgColor)
  const textColor = isLight ? "#5a3545" : "#fce8f0"
  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-10 gap-5 min-h-[600px]" style={{ backgroundColor: bgColor }}>
      {/* Photo with decorative ring */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full scale-110 opacity-30 border-2" style={{ borderColor: btnColor }} />
        {data.publicPhotoUrl ? (
          <img src={data.publicPhotoUrl} alt={data.name ?? ""} className="w-24 h-24 rounded-full object-cover shadow-lg" />
        ) : (
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg" style={{ backgroundColor: btnColor + "33", color: btnColor }}>
            {data.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      {/* Name + bio */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold" style={{ color: textColor }}>{data.name}</h1>
        {data.publicBio && (
          <p className="text-sm mt-1.5 leading-relaxed opacity-70 max-w-xs mx-auto" style={{ color: textColor }}>{data.publicBio}</p>
        )}
      </div>

      {/* Soft divider with heart */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-px opacity-20" style={{ backgroundColor: btnColor }} />
        <span className="text-xs opacity-50" style={{ color: btnColor }}>✿</span>
        <div className="flex-1 h-px opacity-20" style={{ backgroundColor: btnColor }} />
      </div>

      {/* Buttons */}
      <div className="w-full space-y-2.5">
        {buttons.map((b) => (
          <PubButton key={b.id} label={b.label} type={b.type} btnColor={btnColor} btnText={btnText} btnRadius={btnRadius} onClick={() => onBtn(b)} />
        ))}
      </div>
    </div>
  )
}

// ── Booking Modal ─────────────────────────────────────────────────────────────

function BookingModal({ data, font, onClose }: { data: PageData; font: string; onClose: () => void }) {
  const [step, setStep]                 = useState<"service"|"datetime"|"info"|"done">("service")
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [form, setForm]                 = useState({ name: "", phone: "" })
  const [saving, setSaving]             = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const availDays = data.availability.filter((a) => a.active).map((a) => a.dayOfWeek)
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calDays: (Date | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]
  const today = new Date(); today.setHours(0,0,0,0)

  const dayAvail = selectedDate ? data.availability.find((a) => a.dayOfWeek === selectedDate.getDay()) : null
  const slots    = dayAvail && selectedService ? generateSlots(dayAvail.startTime, dayAvail.endTime, selectedService.duration) : []

  async function handleBook() {
    if (!selectedService || !selectedDate || !selectedSlot) return
    setSaving(true)
    const dateStr = selectedDate.toISOString().slice(0, 10)
    await fetch(`/api/agendar/${data.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName: form.name, clientPhone: form.phone, serviceId: selectedService.id, date: dateStr, startTime: selectedSlot }),
    })
    setSaving(false)
    setStep("done")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ fontFamily: `'${font}', sans-serif` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step !== "service" && step !== "done" && (
              <button onClick={() => setStep(step === "datetime" ? "service" : "datetime")} className="text-gray-400 hover:text-gray-600">
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-gray-900">
                {step === "service" ? "Escolha o serviço" : step === "datetime" ? "Escolha a data" : step === "info" ? "Seus dados" : "Confirmado! 🎉"}
              </h2>
              <p className="text-xs text-gray-400">{data.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
          {/* Step: Done */}
          {step === "done" && (
            <div className="text-center py-6">
              <CheckCircle size={52} className="mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">Agendamento confirmado!</h3>
              <p className="text-gray-500 text-sm">
                <strong>{selectedService?.name}</strong><br />
                {selectedDate?.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} às {selectedSlot}
              </p>
              <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
                Fechar
              </button>
            </div>
          )}

          {/* Step: Service */}
          {step === "service" && (
            <div className="space-y-2">
              {data.services.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">Nenhum serviço disponível no momento.</p>
              )}
              {data.services.map((s) => (
                <button key={s.id} onClick={() => { setSelectedService(s); setStep("datetime") }}
                  className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-left group">
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-purple-800">{s.name}</p>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={11} /> {s.duration} min</p>
                  </div>
                  <span className="font-semibold text-purple-700">
                    {s.price === 0 ? "Gratuito" : formatCurrency(s.price)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step: DateTime */}
          {step === "datetime" && (
            <div>
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">‹</button>
                <span className="text-sm font-semibold text-gray-700">{MONTHS[month]} {year}</span>
                <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">›</button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => <div key={d} className="text-center text-xs text-gray-400 py-1 font-medium">{d}</div>)}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 mb-5">
                {calDays.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />
                  const isAvail = availDays.includes(d.getDay()) && d >= today
                  const isSel   = selectedDate?.toDateString() === d.toDateString()
                  return (
                    <button key={d.toISOString()} disabled={!isAvail} onClick={() => { setSelectedDate(d); setSelectedSlot(null) }}
                      className={`h-9 rounded-xl text-sm transition-colors font-medium ${
                        isSel ? "bg-purple-600 text-white shadow-md" :
                        isAvail ? "hover:bg-purple-100 text-gray-700 hover:text-purple-700" :
                        "text-gray-300 cursor-not-allowed"
                      }`}>{d.getDate()}</button>
                  )
                })}
              </div>

              {/* Slots */}
              {selectedDate && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Calendar size={13} className="text-purple-500" />
                    {slots.length > 0 ? "Horários disponíveis" : "Sem horários neste dia"}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((s) => (
                      <button key={s} onClick={() => setSelectedSlot(s)}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                          selectedSlot === s ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-700"
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setStep("info")} disabled={!selectedSlot}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
                Continuar
              </button>
            </div>
          )}

          {/* Step: Info */}
          {step === "info" && (
            <div>
              <div className="bg-purple-50 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm font-medium text-purple-800">{selectedService?.name}</p>
                <p className="text-xs text-purple-500 mt-0.5">
                  {selectedDate?.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} · {selectedSlot}
                </p>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Seu nome" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
                  <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="(11) 99999-9999" />
                </div>
              </div>

              <button onClick={handleBook} disabled={saving || !form.name || !form.phone}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
                {saving ? "Confirmando…" : "Confirmar agendamento"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function isLightColor(hex: string): boolean {
  const h = hex.replace("#", "")
  if (h.length < 6) return true
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function useContrastColor(ref: string, dark: string, light: string): string {
  return isLightColor(ref) ? dark : light
}
