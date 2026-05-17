"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Calendar, Clock, CheckCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Service = { id: string; name: string; price: number; duration: number }
type Availability = { dayOfWeek: number; startTime: string; endTime: string; active: boolean }
type UserData = { id: string; name: string; services: Service[]; availability: Availability[] }

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

function generateSlots(start: string, end: string, duration: number) {
  const slots: string[] = []
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  let cur = sh * 60 + sm
  const endMin = eh * 60 + em
  while (cur + duration <= endMin) {
    const h = Math.floor(cur / 60)
    const m = cur % 60
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
    cur += duration
  }
  return slots
}

export default function AgendarPage() {
  const { slug } = useParams<{ slug: string }>()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [step, setStep] = useState<"service" | "datetime" | "info" | "done">("service")
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", phone: "" })
  const [saving, setSaving] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    fetch(`/api/agendar/${slug}`).then((r) => r.json()).then(setUserData)
  }, [slug])

  if (!userData) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 to-indigo-900 flex items-center justify-center">
      <p className="text-white">Carregando...</p>
    </div>
  )

  const availDays = userData.availability.filter((a) => a.active).map((a) => a.dayOfWeek)
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calDays: (Date | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  const dayAvail = selectedDate
    ? userData.availability.find((a) => a.dayOfWeek === selectedDate.getDay())
    : null

  const slots = dayAvail && selectedService
    ? generateSlots(dayAvail.startTime, dayAvail.endTime, selectedService.duration)
    : []

  async function handleBook() {
    if (!selectedService || !selectedDate || !selectedSlot) return
    setSaving(true)

    const dateStr = selectedDate.toISOString().slice(0, 10)
    await fetch(`/api/agendar/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: form.name,
        clientPhone: form.phone,
        serviceId: selectedService.id,
        date: dateStr,
        startTime: selectedSlot,
      }),
    })

    setSaving(false)
    setStep("done")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔮</div>
          <h1 className="text-2xl font-bold text-white">{userData.name}</h1>
          <p className="text-purple-300 text-sm">Agendamento online</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Etapas */}
          {step !== "done" && (
            <div className="flex border-b border-gray-100">
              {["service", "datetime", "info"].map((s, i) => (
                <div key={s} className={`flex-1 py-2.5 text-center text-xs font-medium ${step === s ? "text-purple-700 border-b-2 border-purple-600" : "text-gray-400"}`}>
                  {i + 1}. {s === "service" ? "Serviço" : s === "datetime" ? "Data/hora" : "Seus dados"}
                </div>
              ))}
            </div>
          )}

          <div className="p-6">
            {step === "done" && (
              <div className="text-center py-6">
                <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Agendado!</h2>
                <p className="text-gray-500 text-sm">
                  {selectedService?.name} em{" "}
                  {selectedDate?.toLocaleDateString("pt-BR")} às {selectedSlot}
                </p>
                <p className="text-gray-400 text-xs mt-3">Você receberá um lembrete pelo WhatsApp</p>
              </div>
            )}

            {step === "service" && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-4">Escolha o serviço</h2>
                <div className="space-y-2">
                  {userData.services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedService(s); setStep("datetime") }}
                      className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock size={12} /> {s.duration} min
                        </p>
                      </div>
                      <span className="font-semibold text-purple-700">{formatCurrency(s.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "datetime" && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-4">Escolha a data</h2>

                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-gray-600 p-1">‹</button>
                  <span className="text-sm font-medium text-gray-700">{MONTHS[month]} {year}</span>
                  <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-gray-600 p-1">›</button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {DAYS.map((d) => <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {calDays.map((d, i) => {
                    if (!d) return <div key={`e${i}`} />
                    const available = availDays.includes(d.getDay()) && d >= new Date()
                    const isSelected = selectedDate?.toDateString() === d.toDateString()
                    return (
                      <button
                        key={d.toISOString()}
                        disabled={!available}
                        onClick={() => { setSelectedDate(d); setSelectedSlot(null) }}
                        className={`h-8 rounded-lg text-sm transition-colors ${
                          isSelected ? "bg-purple-600 text-white" :
                          available ? "hover:bg-purple-100 text-gray-700" :
                          "text-gray-300 cursor-not-allowed"
                        }`}
                      >
                        {d.getDate()}
                      </button>
                    )
                  })}
                </div>

                {selectedDate && slots.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Calendar size={13} /> Horários disponíveis
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedSlot(s)}
                          className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                            selectedSlot === s ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-700 hover:border-purple-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button onClick={() => setStep("service")} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">Voltar</button>
                  <button
                    onClick={() => setStep("info")}
                    disabled={!selectedDate || !selectedSlot}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {step === "info" && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-1">Seus dados</h2>
                <p className="text-sm text-gray-500 mb-4">
                  {selectedService?.name} · {selectedDate?.toLocaleDateString("pt-BR")} às {selectedSlot}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button onClick={() => setStep("datetime")} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">Voltar</button>
                  <button
                    onClick={handleBook}
                    disabled={saving || !form.name || !form.phone}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
                  >
                    {saving ? "Agendando..." : "Confirmar agendamento"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
