"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { matchesClient } from "@/lib/name-search"

type Option = { id: string; name: string; phone?: string | null }

export function ClientSearchSelect({
  clients,
  value,
  onChange,
  className = "",
  placeholder = "Digite o nome da cliente",
}: {
  clients: Option[]
  value: string
  onChange: (id: string) => void
  className?: string
  placeholder?: string
}) {
  const selected = clients.find((c) => c.id === value) ?? null
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const results = useMemo(() => {
    const list = query.trim() ? clients.filter((c) => matchesClient(c, query)) : clients
    return list.slice(0, 50)
  }, [clients, query])

  // Fecha ao clicar fora
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  // Mantém a opção marcada visível ao usar as setas
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" })
  }, [active])

  function pick(c: Option) {
    onChange(c.id)
    setQuery("")
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      if (open && results[active]) {
        e.preventDefault()
        pick(results[active])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={open ? query : selected?.name ?? ""}
        placeholder={selected && open ? selected.name : placeholder}
        onFocus={() => { setOpen(true); setActive(0) }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        className={`${className} pl-9 ${selected ? "pr-8" : ""}`}
      />
      {/* Mantém o "campo obrigatório" do formulário */}
      <input
        tabIndex={-1}
        required
        value={value}
        onChange={() => {}}
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-0 opacity-0 pointer-events-none"
      />
      {selected && !open && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
          aria-label="Limpar cliente"
        >
          <X size={14} />
        </button>
      )}

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-[rgba(170,85,249,0.25)] bg-white dark:bg-[#1a1a2e] shadow-lg py-1"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">Nenhuma cliente encontrada</li>
          )}
          {results.map((c, i) => (
            <li
              key={c.id}
              onMouseDown={(e) => { e.preventDefault(); pick(c) }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${
                i === active ? "bg-purple-50 dark:bg-[rgba(170,85,249,0.15)]" : ""
              } ${c.id === value ? "font-semibold text-purple-700 dark:text-[#cc88ff]" : "text-gray-800 dark:text-gray-200"}`}
            >
              <span className="truncate">{c.name}</span>
              {c.phone && <span className="text-xs text-gray-400 flex-shrink-0">{c.phone}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
