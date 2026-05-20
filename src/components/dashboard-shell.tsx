"use client"

import { UpgradeProvider } from "@/components/upgrade-provider"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <UpgradeProvider>{children}</UpgradeProvider>
}
