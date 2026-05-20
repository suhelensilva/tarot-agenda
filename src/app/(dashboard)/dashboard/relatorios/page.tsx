"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Users, XCircle, BarChart2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { PlanGate } from "@/components/plan-gate"

type MonthData = { label: string; revenue: number; count: number }
type ClientStat = { id: string; name: string; totalSessions: number; totalRevenue: number }
type CancelReason = { cancellationReason: string | null; _count: number }
type StatusCount = { status: string; _count: number }

const statusLabel: Record<string, string> = {
  SCHEDULED: "Agendados",
  CONFIRMED: "Confirmados",
  COMPLETED: "Realizados",
  NO_SHOW: "Faltas",
  CANCELLED: "Cancelados",
}

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-yellow-400",
  CONFIRMED: "bg-blue-400",
  COMPLETED: "bg-green-400",
  NO_SHOW: "bg-red-400",
  CANCELLED: "bg-gray-300",
}

export default function RelatoriosPage() {
  const [data, setData] = useState<{
    monthlyRevenue: MonthData[]
    clientStats: ClientStat[]
    cancelReasons: CancelReason[]
    statusCounts: StatusCount[]
  } | null>(null)

  useEffect(() => {
    fetch("/api/relatorios").then((r) => r.json()).then(setData)
  }, [])

  if (!data) return (
    <PlanGate feature="relatorios" message="Relatórios e métricas estão disponíveis a partir do plano Pró.">
      <div className="p-8 text-gray-400">Carregando...</div>
    </PlanGate>
  )

  const maxRevenue = Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1)
  const totalRevenue = data.monthlyRevenue.reduce((s, m) => s + m.revenue, 0)
  const totalSessions = data.statusCounts.find((s) => s.status === "COMPLETED")?._count ?? 0
  const totalNoShow = data.statusCounts.find((s) => s.status === "NO_SHOW")?._count ?? 0

  return (
    <PlanGate feature="relatorios" message="Relatórios e métricas estão disponíveis a partir do plano Pró.">
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-50 text-green-600 w-9 h-9 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <span className="text-sm text-gray-500">Faturamento (6 meses)</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-50 text-purple-600 w-9 h-9 rounded-lg flex items-center justify-center">
              <BarChart2 size={18} />
            </div>
            <span className="text-sm text-gray-500">Sessões realizadas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-50 text-red-600 w-9 h-9 rounded-lg flex items-center justify-center">
              <XCircle size={18} />
            </div>
            <span className="text-sm text-gray-500">Faltas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalNoShow}</p>
        </div>
      </div>

      {/* Faturamento mensal */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Faturamento mensal</h2>
        <div className="space-y-3">
          {data.monthlyRevenue.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-24 shrink-0">{m.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-900 w-28 text-right">{formatCurrency(m.revenue)}</span>
              <span className="text-xs text-gray-400 w-16 text-right">{m.count} sess.</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status geral */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Situação dos agendamentos</h2>
          <div className="space-y-3">
            {data.statusCounts.map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${statusColor[s.status] ?? "bg-gray-300"}`} />
                <span className="text-sm text-gray-600 flex-1">{statusLabel[s.status] ?? s.status}</span>
                <span className="text-sm font-semibold text-gray-900">{s._count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Motivos de cancelamento */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Motivos de cancelamento</h2>
          {data.cancelReasons.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum cancelamento com motivo registrado</p>
          ) : (
            <div className="space-y-2">
              {data.cancelReasons.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">{r.cancellationReason ?? "Sem motivo"}</span>
                  <span className="font-semibold text-gray-900 ml-2 shrink-0">{r._count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top clientes */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Clientes — histórico</h2>
        </div>
        {data.clientStats.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum dado ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-400 font-medium">Cliente</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Sessões</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Total investido</th>
                </tr>
              </thead>
              <tbody>
                {data.clientStats.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{c.name}</td>
                    <td className="py-2.5 text-right text-gray-600">{c.totalSessions}</td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">{formatCurrency(c.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </PlanGate>
  )
}
