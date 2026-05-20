"use client"

import { createContext, useContext, useState, useCallback } from "react"
import { Crown, Sparkles, ArrowRight, X } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { planLabel } from "@/lib/plan"

// ─── Context ──────────────────────────────────────────────────────────────────

type UpgradeContextType = {
  showUpgrade: (message?: string) => void
}

const UpgradeContext = createContext<UpgradeContextType>({ showUpgrade: () => {} })

export function useUpgrade() {
  return useContext(UpgradeContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const { data: session } = useSession()

  const showUpgrade = useCallback((msg?: string) => {
    setMessage(msg ?? null)
    setOpen(true)
  }, [])

  return (
    <UpgradeContext.Provider value={{ showUpgrade }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Gradient top bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-purple-400 via-purple-600 to-violet-500" />

            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="px-7 py-6 text-center">
              {/* Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-200 flex items-center justify-center mb-4">
                <Crown size={30} className="text-purple-600" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Faça o upgrade! ✨
              </h2>

              <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                {message ?? "Este recurso não está disponível no seu plano atual."}
                {" "}
                <span className="font-medium text-purple-600">
                  Faça upgrade e desbloqueie tudo.
                </span>
              </p>

              {/* Plan comparison pills */}
              <div className="flex gap-2 justify-center mb-6">
                <div className="flex items-center gap-1.5 bg-gray-100 text-gray-500 rounded-full px-3 py-1.5 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Grátis — atual
                </div>
                <div className="flex items-center gap-1.5 bg-purple-100 text-purple-700 rounded-full px-3 py-1.5 text-xs font-semibold">
                  <Sparkles size={11} />
                  Pró ou Premium
                </div>
              </div>

              <Link
                href="/dashboard/assinatura"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-purple-200"
              >
                <Crown size={15} />
                Ver planos e preços
                <ArrowRight size={14} />
              </Link>

              <button
                onClick={() => setOpen(false)}
                className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full py-1"
              >
                Agora não
              </button>
            </div>

            <p className="text-center text-xs text-gray-300 pb-4">
              Você está no plano <span className="font-medium">{planLabel(session?.user?.plan)}</span>
            </p>
          </div>
        </div>
      )}
    </UpgradeContext.Provider>
  )
}

// ─── Helper: fetch com captura automática de PLAN_LIMIT ───────────────────────

/**
 * Use no lugar de fetch() em páginas do dashboard.
 * Se a API retornar { code: "PLAN_LIMIT" }, abre o popup automaticamente.
 */
export function usePlanFetch() {
  const { showUpgrade } = useUpgrade()

  const planFetch = useCallback(
    async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      const res = await fetch(input, init)

      if (res.status === 403) {
        // Clone para não consumir o body
        const clone = res.clone()
        try {
          const json = await clone.json()
          if (json?.code === "PLAN_LIMIT") {
            showUpgrade(json.error)
          }
        } catch {
          // não era JSON, ignora
        }
      }

      return res
    },
    [showUpgrade]
  )

  return planFetch
}
