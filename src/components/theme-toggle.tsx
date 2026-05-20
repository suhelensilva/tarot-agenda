"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-24 h-7" />

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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
