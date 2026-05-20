"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}

// Modo compacto: ícone único que cicla light → dark → system
export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className={compact ? "w-10 h-10" : "w-24 h-7"} />

  if (compact) {
    const cycle = () => {
      if (theme === "light") setTheme("dark")
      else if (theme === "dark") setTheme("system")
      else setTheme("light")
    }
    const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor
    const label = theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema"

    return (
      <button
        onClick={cycle}
        title={`Tema: ${label}`}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-[#aa55f9] hover:bg-gray-50 dark:hover:bg-[rgba(170,85,249,0.08)] transition-all"
      >
        <Icon size={17} />
      </button>
    )
  }

  const options = [
    { value: "light",  icon: Sun,     label: "Claro"   },
    { value: "system", icon: Monitor, label: "Sistema" },
    { value: "dark",   icon: Moon,    label: "Escuro"  },
  ]

  return (
    <div className="flex items-center bg-gray-100 dark:bg-[rgba(170,85,249,0.08)] dark:[border:1px_solid_rgba(170,85,249,0.15)] rounded-lg p-0.5 gap-0.5">
      {options.map(({ value, icon: Icon, label }) => {
        const active = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            className={cn(
              "flex items-center justify-center w-7 h-6 rounded-md transition-all duration-150",
              active
                ? "bg-white dark:bg-[rgba(170,85,249,0.25)] text-purple-600 dark:text-[#aa55f9] shadow-sm dark:[box-shadow:0_0_8px_rgba(170,85,249,0.4)]"
                : "text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400"
            )}
          >
            <Icon size={12} />
          </button>
        )
      })}
    </div>
  )
}
