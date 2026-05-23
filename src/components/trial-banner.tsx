"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Crown, Sparkles } from "lucide-react"

export function TrialBanner() {
  const { data: session } = useSession()
  const router = useRouter()

  const trialEndsAt = session?.user?.trialEndsAt
  const plan = session?.user?.plan

  if (!trialEndsAt || plan !== "PREMIUM") return null

  const end = new Date(trialEndsAt)
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) return null

  const isUrgent = daysLeft <= 2

  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3 ${
      isUrgent
        ? "bg-amber-500/10 border-b border-amber-500/20"
        : "bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border-b border-purple-500/20"
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUrgent ? "bg-amber-500/20" : "bg-purple-500/20"
        }`}>
          {isUrgent ? <Crown size={15} className="text-amber-500" /> : <Sparkles size={15} className="text-purple-500" />}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-tight ${
            isUrgent ? "text-amber-700 dark:text-amber-400" : "text-purple-800 dark:text-purple-200"
          }`}>
            {isUrgent
              ? `⏳ Seu período gratuito expira em ${daysLeft} dia${daysLeft > 1 ? "s" : ""}!`
              : `✨ ${daysLeft} dia${daysLeft > 1 ? "s" : ""} restante${daysLeft > 1 ? "s" : ""} de Premium gratuito`
            }
          </p>
          <p className={`text-xs mt-0.5 ${
            isUrgent ? "text-amber-600 dark:text-amber-500" : "text-purple-600 dark:text-purple-400"
          }`}>
            {isUrgent
              ? "Assine agora e não perca nenhum recurso que você já está usando."
              : "Está gostando? Assine o Premium e mantenha acesso ilimitado a tudo."
            }
          </p>
        </div>
      </div>
      <button
        onClick={() => router.push("/dashboard/assinatura")}
        className={`flex items-center gap-1.5 shrink-0 font-semibold text-xs px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
          isUrgent
            ? "bg-amber-500 hover:bg-amber-400 text-white"
            : "bg-purple-600 hover:bg-purple-500 text-white"
        }`}
      >
        <Crown size={12} />
        {isUrgent ? "Assinar agora" : "Ativar Premium"}
      </button>
    </div>
  )
}
