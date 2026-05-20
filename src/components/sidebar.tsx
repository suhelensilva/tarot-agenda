"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  CalendarDays, Users, LayoutDashboard, Package,
  MessageSquare, BarChart3, Settings, LogOut, Link2,
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
      w-16 flex flex-col items-center
      bg-white dark:bg-[#0f0f1a]
      border-r border-gray-200 dark:[border-right:1px_solid_rgba(170,85,249,0.12)]
    ">
      {/* Logo */}
      <div className="py-5 flex items-center justify-center w-full border-b border-gray-100 dark:border-[rgba(170,85,249,0.1)]">
        <span className="text-xl">🔮</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto w-full px-2">
        {nav.map(({ href, icon: Icon, label, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150",
                active
                  ? [
                      "bg-purple-50 text-purple-700",
                      "dark:text-[#aa55f9] dark:bg-[rgba(170,85,249,0.12)]",
                      "dark:[box-shadow:inset_0_0_0_1px_rgba(170,85,249,0.2)]",
                    ].join(" ")
                  : [
                      "text-gray-400 hover:bg-gray-50 hover:text-gray-700",
                      "dark:text-gray-500 dark:hover:bg-[rgba(170,85,249,0.06)] dark:hover:text-[#aa55f9]",
                    ].join(" ")
              )}
            >
              <Icon
                size={18}
                className={active ? "dark:[filter:drop-shadow(0_0_6px_rgba(170,85,249,0.9))]" : ""}
              />
              {active && (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-purple-500 dark:bg-[#aa55f9] dark:[box-shadow:0_0_6px_rgba(170,85,249,1)]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 pb-4 pt-3 border-t border-gray-100 dark:border-[rgba(170,85,249,0.1)] w-full px-2">
        {/* Tema toggle compacto */}
        <ThemeToggle compact />

        {/* Avatar */}
        <div className="relative">
          <div
            title={user?.name ?? ""}
            className="w-8 h-8 rounded-full bg-purple-100 dark:bg-[rgba(170,85,249,0.15)] flex items-center justify-center text-sm font-bold text-purple-700 dark:text-[#aa55f9] dark:[box-shadow:0_0_10px_rgba(170,85,249,0.2)] cursor-default"
          >
            {user?.name?.[0]?.toUpperCase() ?? "T"}
          </div>
        </div>

        {/* Logout */}
        <button
          title="Sair"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  )
}
