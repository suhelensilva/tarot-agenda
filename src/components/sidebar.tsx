"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  CalendarDays,
  Users,
  LayoutDashboard,
  Package,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Link2,
} from "lucide-react"

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Painel", exact: true },
  { href: "/dashboard/agenda", icon: CalendarDays, label: "Agenda", exact: false },
  { href: "/dashboard/clientes", icon: Users, label: "Clientes", exact: false },
  { href: "/dashboard/servicos", icon: Package, label: "Serviços", exact: false },
  { href: "/dashboard/mensagens", icon: MessageSquare, label: "Mensagens", exact: false },
  { href: "/dashboard/link", icon: Link2, label: "Link Público", exact: false },
  { href: "/dashboard/relatorios", icon: BarChart3, label: "Relatórios", exact: false },
  { href: "/dashboard/configuracoes", icon: Settings, label: "Configurações", exact: false },
]

export default function Sidebar({ user }: { user: { name?: string | null; email?: string | null; plan?: string } }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          <div>
            <p className="font-bold text-gray-900 text-sm">Mística Agenda</p>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              user?.plan === "PRO"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-500"
            )}>
              {user?.plan === "PRO" ? "PRO" : "Grátis"}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, icon: Icon, label, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"))
                ? "bg-purple-50 text-purple-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">
            {user?.name?.[0]?.toUpperCase() ?? "T"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? "Taróloga"}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
