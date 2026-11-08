"use client"

import { useSession, signOut } from "next-auth/react"
import { User, CreditCard, LogOut } from "lucide-react"
import Link from "next/link"

export default function ContaPage() {
  const { data: session } = useSession()

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minha Conta</h1>

      {/* Dados da conta */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-purple-50 text-purple-600 w-9 h-9 rounded-lg flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Informações da conta</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Seus dados de acesso ao sistema</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Nome</label>
            <p className="text-sm text-gray-900 dark:text-white font-medium">{session?.user?.name ?? "—"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">E-mail</label>
            <p className="text-sm text-gray-900 dark:text-white font-medium">{session?.user?.email ?? "—"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Plano atual</label>
            <p className="text-sm text-gray-900 dark:text-white font-medium capitalize">{session?.user?.plan?.toLowerCase() ?? "gratuito"}</p>
          </div>
        </div>
      </div>

      {/* Assinatura */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-violet-50 text-violet-600 w-9 h-9 rounded-lg flex items-center justify-center">
            <CreditCard size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Assinatura</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie seu plano e pagamento</p>
          </div>
        </div>
        <Link href="/dashboard/assinatura" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <CreditCard size={14} />
          Gerenciar assinatura
        </Link>
      </div>

      {/* Sair */}
      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Sair da conta</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Você será desconectado do sistema.</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200 dark:border-red-500/20"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </div>
  )
}
