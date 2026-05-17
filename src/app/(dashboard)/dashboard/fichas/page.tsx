"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import FichasTab from "@/components/fichas-tab"

type Client = { id: string; name: string; birthDate: string | null }

export default function FichasPage() {
  const searchParams = useSearchParams()
  const defaultClientId = searchParams.get("clientId") ?? undefined
  const defaultClientName = searchParams.get("clientName") ?? undefined

  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FichasTab
        clients={clients}
        defaultClientId={defaultClientId}
        defaultClientName={defaultClientName}
      />
    </div>
  )
}
