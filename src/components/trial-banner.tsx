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
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
      isUrgent
        ? "bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400"
        : "bg-purple-500/10 border-b border-purple-500/20 text-purple-700 dark:text-purple-300"
    }`}>
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="shrink-0" />
        <span>
          {isUrgent
            ? `⚠️ Seu trial Premium expira em ${daysLeft} dia${daysLeft > 1 ? "s" : ""}! Assine para não perder o acesso.`
            : `🎁 Você está no trial Premium gratuito — ${daysLeft} dia${daysLeft > 1 ? "s" : ""} restante${daysLeft > 1 ? "s" : ""}.`
          }
        </span>
      </div>
      <button
        onClick={() => router.push("/dashboard/assinatura")}
        className={`flex items-center gap-1.5 shrink-0 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors ${
          isUrgent
            ? "bg-amber-500 hover:bg-amber-400 text-white"
            : "bg-purple-600 hover:bg-purple-500 text-white"
        }`}
      >
        <Crown size={12} /> Assinar agora
      </button>
    </div>
  )
}
