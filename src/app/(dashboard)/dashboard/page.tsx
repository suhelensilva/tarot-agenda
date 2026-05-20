import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import { CalendarDays, Users, TrendingUp, Clock, Cake } from "lucide-react"
import { startOfMonth, endOfMonth } from "date-fns"

function getMMDD(date: Date | string): string {
  const d = new Date(date)
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function formatBirthday(birthDate: Date | string): string {
  const d = new Date(birthDate)
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}
function whatsappBirthdayLink(phone: string, name: string, isToday: boolean): string {
  const number = phone.replace(/\D/g, "")
  const firstName = name.split(" ")[0]
  const msg = isToday
    ? `Feliz aniversário, ${firstName}! 🎂🎉 Que este novo ciclo seja cheio de luz, saúde e realizações! ✨`
    : `Oi ${firstName}! Vi aqui que seu aniversário está chegando 🎂 Desejo um dia incrível! 🎉✨`
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
}
function calcAge(birthDate: Date | string): number {
  const bd = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - bd.getFullYear()
  const m = today.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--
  return age
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user.id
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const monthStart = startOfMonth(now)
  const monthEnd   = endOfMonth(now)

  const [totalClients, appointmentsThisMonth, upcomingToday, revenue, clientsWithBirthday] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.appointment.count({ where: { userId, startTime: { gte: monthStart, lte: monthEnd } } }),
    prisma.appointment.findMany({
      where: { userId, startTime: { gte: todayStart, lte: todayEnd }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
      include: { client: true, service: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.aggregate({
      where: { userId, startTime: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
      _sum: { amountPaid: true },
    }),
    prisma.client.findMany({
      where: { userId, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true, phone: true },
    }),
  ])

  const todayMMDD = getMMDD(now)
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() + i + 1); return getMMDD(d)
  })
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const restOfMonth: string[] = []
  for (let day = now.getDate() + 8; day <= daysInMonth; day++) {
    restOfMonth.push(`${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
  }

  type BirthdayClient = { id: string; name: string; birthDate: Date | null; phone: string }
  const birthdaysToday = clientsWithBirthday.filter((c: BirthdayClient) => getMMDD(c.birthDate!) === todayMMDD)
  const birthdaysWeek  = clientsWithBirthday.filter((c: BirthdayClient) => next7.includes(getMMDD(c.birthDate!)))
  const birthdaysMonth = clientsWithBirthday.filter((c: BirthdayClient) => restOfMonth.includes(getMMDD(c.birthDate!)))
  const hasBirthdays   = birthdaysToday.length + birthdaysWeek.length + birthdaysMonth.length > 0

  const stats = [
    { label: "Clientes",              value: totalClients,                                   icon: Users,        color: "text-blue-500",   bg: "bg-blue-50   dark:bg-blue-500/10",   glow: "rgba(59,130,246,0.5)"   },
    { label: "Atendimentos este mês", value: appointmentsThisMonth,                          icon: CalendarDays, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10", glow: "rgba(170,85,249,0.55)"  },
    { label: "Faturamento do mês",    value: formatCurrency(revenue._sum.amountPaid ?? 0),   icon: TrendingUp,   color: "text-green-500",  bg: "bg-green-50  dark:bg-green-500/10",  glow: "rgba(34,197,94,0.5)"    },
    { label: "Agendamentos hoje",     value: upcomingToday.length,                           icon: Clock,        color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10", glow: "rgba(249,115,22,0.5)"   },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Olá, <span className="dark:text-[#aa55f9]">{session?.user.name?.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Aqui está o resumo de hoje</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="relative bg-white dark:bg-[#13131f] rounded-xl border border-gray-200 dark:border-[rgba(170,85,249,0.15)] p-6 dark:hover:border-[rgba(170,85,249,0.3)] transition-all overflow-hidden group">
            {/* Glow neon embaixo — só no dark */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px opacity-0 dark:opacity-100 transition-all duration-300 group-hover:opacity-100 group-hover:h-0.5"
              style={{ background: stat.glow, boxShadow: `0 0 12px 3px ${stat.glow}` }}
            />
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-8 opacity-0 dark:opacity-100 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at bottom, ${stat.glow} 0%, transparent 80%)` }}
            />
            <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-lg flex items-center justify-center mb-4 relative z-10`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white relative z-10">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 relative z-10">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Agenda do dia */}
        <div className="lg:col-span-2 relative bg-white dark:bg-[#13131f] rounded-xl border border-gray-200 dark:border-[rgba(170,85,249,0.15)] p-6 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-20 opacity-0 dark:opacity-100 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at bottom, rgba(170,85,249,0.18) 0%, transparent 70%)" }} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Agenda de hoje</h2>
          {upcomingToday.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum atendimento agendado para hoje</p>
          ) : (
            <div className="space-y-3">
              {upcomingToday.map((apt: typeof upcomingToday[0]) => (
                <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-[rgba(170,85,249,0.06)] dark:border dark:border-[rgba(170,85,249,0.1)]">
                  <div className="text-sm font-mono text-purple-600 dark:text-[#aa55f9] font-bold w-12">
                    {new Date(apt.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{apt.client.name}</p>
                    {apt.service && <p className="text-xs text-gray-500 dark:text-gray-400">{apt.service.name}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    apt.status === "CONFIRMED"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400"
                  }`}>
                    {apt.status === "CONFIRMED" ? "Confirmado" : "Agendado"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aniversariantes */}
        <div className="relative bg-white dark:bg-[#13131f] rounded-xl border border-gray-200 dark:border-[rgba(170,85,249,0.15)] p-6 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-20 opacity-0 dark:opacity-100 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at bottom, rgba(236,72,153,0.18) 0%, transparent 70%)" }} />
          <div className="flex items-center gap-2 mb-4">
            <Cake size={18} className="text-pink-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aniversariantes</h2>
          </div>

          {!hasBirthdays ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum aniversário nos próximos dias</p>
          ) : (
            <div className="space-y-4">
              {birthdaysToday.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-pink-500 uppercase tracking-wide mb-2">🎂 Hoje</p>
                  <div className="space-y-2">
                    {birthdaysToday.map((c) => (
                      <div key={c.id} className="flex items-center gap-2.5 p-2.5 bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/20 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center text-pink-700 dark:text-pink-400 font-bold text-xs shrink-0">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-pink-500">{calcAge(c.birthDate!) + 1} anos hoje 🎉</p>
                        </div>
                        <a href={whatsappBirthdayLink(c.phone, c.name, true)} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-500 border border-green-200 dark:border-green-500/30 hover:border-green-400 rounded-md px-2 py-1 shrink-0 transition-colors bg-white dark:bg-transparent">
                          WhatsApp
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {birthdaysWeek.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-purple-500 dark:text-[#aa55f9] uppercase tracking-wide mb-2">📅 Esta semana</p>
                  <div className="space-y-1.5">
                    {birthdaysWeek.map((c) => (
                      <div key={c.id} className="flex items-center gap-2.5 py-1.5">
                        <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-[rgba(170,85,249,0.15)] flex items-center justify-center text-purple-700 dark:text-[#aa55f9] font-bold text-xs shrink-0">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatBirthday(c.birthDate!)}</span>
                        <a href={whatsappBirthdayLink(c.phone, c.name, false)} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-500 border border-green-200 dark:border-green-500/30 rounded-md px-2 py-1 shrink-0 transition-colors">
                          WhatsApp
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {birthdaysMonth.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">🗓️ Este mês</p>
                  <div className="space-y-1.5">
                    {birthdaysMonth.map((c) => (
                      <div key={c.id} className="flex items-center gap-2.5 py-1.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xs shrink-0">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{c.name}</p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatBirthday(c.birthDate!)}</span>
                        <a href={whatsappBirthdayLink(c.phone, c.name, false)} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-500 border border-green-200 dark:border-green-500/30 rounded-md px-2 py-1 shrink-0 transition-colors">
                          WhatsApp
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
