import type { Metadata } from "next"
import { Geist, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/session-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { GOOGLE_FONTS_URL } from "@/lib/fonts"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "Mística Agenda",
  description: "Gerencie seus atendimentos — Mística Agenda",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
