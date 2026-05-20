"use client"

import { useSession } from "next-auth/react"
import { Crown, Lock } from "lucide-react"
import Link from "next/link"
import { getPlanLimits, planLabel, type Plan } from "@/lib/plan"

interface PlanGateProps {
  feature: keyof ReturnType<typeof getPlanLimits>
  children: React.ReactNode
  /** Mensagem exibida na tela de bloqueio */
  message?: string
  /** Plano mínimo necessário (para exibir no CTA) */
  requiredPlan?: "PRO" | "PREMIUM"
}

export function PlanGate({ feature, children, message, requiredPlan = "PRO" }: PlanGateProps) {
  const { data: session } = useSession()
  const limits = getPlanLimits(session?.user?.plan)
  const allowed = limits[feature]

  if (allowed) return <>{children}</>

  const planName = planLabel(requiredPlan)

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
        <Lock size={28} className="text-purple-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Recurso bloqueado</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        {message ?? `Este recurso está disponível a partir do plano ${planName}.`}
      </p>
      <Link
        href="/dashboard/assinatura"
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        <Crown size={16} />
        Ver planos
      </Link>
      <p className="text-xs text-gray-400 mt-3">
        Você está no plano <span className="font-medium">{planLabel(session?.user?.plan)}</span>
      </p>
    </div>
  )
}

/** Banner inline para avisar que o limite está próximo/atingido */
export function PlanLimitBanner({ current, limit, entity }: { current: number; limit: number; entity: string }) {
  if (limit === -1) return null
  const pct = current / limit
  if (pct < 0.8) return null

  const atLimit = current >= limit

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-4 ${
      atLimit
        ? "bg-red-50 border border-red-200 text-red-700"
        : "bg-amber-50 border border-amber-200 text-amber-700"
    }`}>
      <Crown size={15} className="shrink-0" />
      <span className="flex-1">
        {atLimit
          ? `Limite de ${limit} ${entity} atingido. `
          : `Você está usando ${current} de ${limit} ${entity}. `}
        <Link href="/dashboard/assinatura" className="underline font-medium hover:no-underline">
          Faça upgrade para {atLimit ? "adicionar mais" : "continuar crescendo"}.
        </Link>
      </span>
    </div>
  )
}
