"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  CalendarDays, Users, LayoutDashboard, Package,
  MessageSquare, BarChart3, Settings, LogOut, Link2, Crown,
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

const nav = [
  { href: "/dashboard",               icon: LayoutDashboard, label: "Painel",       exact: true  },
  { href: "/dashboard/agenda",        icon: CalendarDays,    label: "Agenda",        exact: false },
  { href: "/dashboard/clientes",      icon: Users,           label: "Clientes",      exact: false },
  { href: "/dashboard/servicos",      icon: Package,         label: "Serviços",      exact: false },
  { href: "/dashboard/mensagens",     icon: MessageSquare,   label: "Mensagens",     exact: false },
  { href: "/dashboard/link",          icon: Link2,           label: "Link Público",  exact: false },
  { href: "/dashboard/relatorios",    icon: BarChart3,       label: "Relatórios",    exact: false },
  { href: "/dashboard/configuracoes", icon: Settings,        label: "Configurações", exact: false },
]

export default function Sidebar({ user }: {
  user: { name?: string | null; email?: string | null; plan?: string }
}) {
  const pathname = usePathname()

  return (
    <aside className="
      w-64 flex flex-col
      bg-white dark:bg-[#0f0f1a]
      border-r border-gray-200 dark:[border-right:1px_solid_rgba(170,85,249,0.12)]
    ">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100 dark:border-[rgba(170,85,249,0.1)]">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Mística Agenda</p>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              user?.plan === "PREMIUM"
                ? "bg-yellow-100 dark:bg-[rgba(170,85,249,0.15)] text-yellow-700 dark:text-[#aa55f9]"
                : user?.plan === "PRO"
                ? "bg-purple-100 dark:bg-[rgba(170,85,249,0.1)] text-purple-700 dark:text-[#aa55f9]"
                : "bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] text-gray-500 dark:text-gray-500"
            )}>
              {user?.plan === "PREMIUM" ? "✨ Premium" : user?.plan === "PRO" ? "Pró" : "Grátis"}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? [
                      "bg-purple-50 text-purple-700",
                      "dark:text-[#aa55f9] dark:bg-[rgba(170,85,249,0.12)]",
                      "dark:[box-shadow:inset_0_0_0_1px_rgba(170,85,249,0.2)]",
                    ].join(" ")
                  : [
                      "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      "dark:text-gray-400 dark:hover:bg-[rgba(170,85,249,0.06)] dark:hover:text-white",
                    ].join(" ")
              )}
            >
              <Icon
                size={17}
                className={active ? "dark:[filter:drop-shadow(0_0_6px_rgba(170,85,249,0.8))]" : ""}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-[#aa55f9] dark:[box-shadow:0_0_6px_rgba(170,85,249,0.9)]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-[rgba(170,85,249,0.1)] space-y-3">
        {/* Tema toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-600">Tema</span>
          <ThemeToggle />
        </div>

        {/* Usuário */}
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-[rgba(170,85,249,0.15)] flex items-center justify-center text-sm font-bold text-purple-700 dark:text-[#aa55f9] dark:[box-shadow:0_0_10px_rgba(170,85,249,0.2)]">
              {user?.name?.[0]?.toUpperCase() ?? "T"}
            </div>
            {(user?.plan === "PREMIUM" || user?.plan === "PRO") && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 dark:bg-[#aa55f9] flex items-center justify-center dark:[box-shadow:0_0_8px_rgba(170,85,249,0.8)]">
                <Crown size={9} className="text-yellow-900 dark:text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name ?? "Taróloga"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </aside>
  )
}
