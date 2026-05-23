import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/sidebar"
import { DashboardShell } from "@/components/dashboard-shell"
import { TrialBanner } from "@/components/trial-banner"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <DashboardShell>
      <div className="flex h-screen bg-gray-50 dark:bg-[#0a0a0f]">
        <Sidebar user={session.user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TrialBanner />
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0a0a0f]">
            {children}
          </main>
        </div>
      </div>
    </DashboardShell>
  )
}
