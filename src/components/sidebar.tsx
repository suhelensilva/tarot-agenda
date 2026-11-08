"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  CalendarDays, Users, LayoutDashboard, Package,
  BarChart3, Settings, LogOut, Link2, Crown, CreditCard, BookHeart, Kanban, Puzzle, User, ChevronUp,
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useState, useRef, useEffect } from "react"

const nav = [
  { href: "/dashboard",               icon: LayoutDashboard, label: "Painel",        exact: true  },
  { href: "/dashboard/agenda",        icon: CalendarDays,    label: "Agenda",         exact: false },
  { href: "/dashboard/clientes",      icon: Users,           label: "Clientes",       exact: false },
  { href: "/dashboard/crm",           icon: Kanban,          label: "CRM",            exact: false },
  { href: "/dashboard/servicos",      icon: Package,         label: "Serviços",       exact: false },
  { href: "/dashboard/link",          icon: Link2,           label: "Link Público",   exact: false },
  { href: "/dashboard/relatorios",    icon: BarChart3,       label: "Relatórios",     exact: false },
  { href: "/dashboard/planner",       icon: BookHeart,       label: "Planner",        exact: false },
  { href: "/dashboard/integracoes",   icon: Puzzle,          label: "Integrações",    exact: false },
  { href: "/dashboard/configuracoes", icon: Settings,        label: "Configurações",  exact: false },
  { href: "/dashboard/assinatura",    icon: CreditCard,      label: "Assinatura",     exact: false },
]

export default function Sidebar({ user }: {
  user: { name?: string | null; email?: string | null; plan?: string }
}) {
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <aside className="
      w-64 flex flex-col relative z-10
      bg-white dark:bg-[#0f0f1a]
      border-r border-[rgba(139,92,246,0.08)] dark:[border-right:1px_solid_rgba(170,85,249,0.12)]
    ">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[rgba(139,92,246,0.07)] dark:border-[rgba(170,85,249,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-[0_2px_10px_rgba(139,92,246,0.4)] dark:shadow-[0_2px_10px_rgba(170,85,249,0.4)]">
            <span className="text-base leading-none">🔮</span>
          </div>
          <div>
            <p className="font-bold text-[#1e1b4b] dark:text-white text-sm tracking-tight">Mística Agenda</p>
            <span className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              user?.plan === "PREMIUM"
                ? "bg-amber-100 text-amber-700 dark:bg-[rgba(170,85,249,0.15)] dark:text-[#aa55f9]"
                : user?.plan === "PRO"
                ? "bg-violet-100 text-violet-700 dark:bg-[rgba(170,85,249,0.1)] dark:text-[#aa55f9]"
                : "bg-slate-100 text-slate-500 dark:bg-[rgba(255,255,255,0.05)] dark:text-gray-500"
            )}>
              {user?.plan === "PREMIUM" ? "✨ Premium" : user?.plan === "PRO" ? "Pró" : "Grátis"}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? [
                      "bg-violet-100 text-violet-700",
                      "dark:text-[#aa55f9] dark:bg-[rgba(170,85,249,0.12)]",
                      "dark:[box-shadow:inset_0_0_0_1px_rgba(170,85,249,0.2)]",
                    ].join(" ")
                  : [
                      "text-slate-500 hover:bg-violet-50 hover:text-violet-700",
                      "dark:text-gray-400 dark:hover:bg-[rgba(170,85,249,0.06)] dark:hover:text-white",
                    ].join(" ")
              )}
            >
              <Icon
                size={17}
                className={active
                  ? "text-violet-600 dark:text-[#aa55f9] dark:[filter:drop-shadow(0_0_6px_rgba(170,85,249,0.8))]"
                  : "text-slate-400 dark:text-gray-500"}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-[#aa55f9] shadow-[0_0_5px_rgba(139,92,246,0.6)] dark:[box-shadow:0_0_6px_rgba(170,85,249,0.9)]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-4 pt-3 border-t border-[rgba(139,92,246,0.07)] dark:border-[rgba(170,85,249,0.1)] space-y-3">
        {/* Tema toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 dark:text-gray-600">Tema</span>
          <ThemeToggle />
        </div>

        {/* Usuário com popover */}
        <div ref={userMenuRef} className="relative">
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[rgba(170,85,249,0.2)] rounded-xl shadow-lg overflow-hidden z-50">
              <Link href="/dashboard/conta" onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-violet-50 dark:hover:bg-[rgba(170,85,249,0.08)] transition-colors">
                <User size={15} className="text-gray-400 dark:text-gray-500" />
                Conta
              </Link>
              <Link href="/dashboard/perfil" onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-violet-50 dark:hover:bg-[rgba(170,85,249,0.08)] transition-colors border-t border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
                <Settings size={15} className="text-gray-400 dark:text-gray-500" />
                Perfil da empresa
              </Link>
              <Link href="/dashboard/assinatura" onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-violet-50 dark:hover:bg-[rgba(170,85,249,0.08)] transition-colors border-t border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
                <CreditCard size={15} className="text-gray-400 dark:text-gray-500" />
                Assinatura
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full text-left border-t border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}

          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 w-full rounded-xl px-2 py-1.5 hover:bg-violet-50 dark:hover:bg-[rgba(170,85,249,0.06)] transition-colors group"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-[0_2px_8px_rgba(139,92,246,0.35)] dark:[box-shadow:0_0_10px_rgba(170,85,249,0.2)]">
                {user?.name?.[0]?.toUpperCase() ?? "T"}
              </div>
              {(user?.plan === "PREMIUM" || user?.plan === "PRO") && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 dark:bg-[#aa55f9] flex items-center justify-center dark:[box-shadow:0_0_8px_rgba(170,85,249,0.8)]">
                  <Crown size={9} className="text-amber-900 dark:text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-[#1e1b4b] dark:text-white truncate group-hover:text-violet-700 dark:group-hover:text-[#aa55f9] transition-colors">{user?.name ?? "Taróloga"}</p>
              <p className="text-xs text-slate-400 dark:text-gray-500 truncate">{user?.email}</p>
            </div>
            <ChevronUp size={14} className={cn("text-gray-400 shrink-0 transition-transform", userMenuOpen ? "rotate-0" : "rotate-180")} />
          </button>
        </div>
      </div>
    </aside>
  )
}
