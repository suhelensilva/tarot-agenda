"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  const options = [
    { value: "light", icon: Sun,     label: "Claro"   },
    { value: "system", icon: Monitor, label: "Sistema" },
    { value: "dark",  icon: Moon,    label: "Escuro"  },
  ]

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
            theme === value
              ? "bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  )
}
