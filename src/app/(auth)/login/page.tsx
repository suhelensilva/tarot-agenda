"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff } from "lucide-react"
import { Cormorant_Garamond } from "next/font/google"

// Serifada elegante, parecida com a do texto do logo
const logoFont = Cormorant_Garamond({ subsets: ["latin"], weight: ["600"] })

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("Email ou senha incorretos")
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center lg:justify-end p-4 lg:pr-[8%] bg-[#15102a] overflow-hidden">
      {/* Celular: imagem cobre a tela toda. Desktop: ver .login-bg abaixo */}
      <div className="login-bg absolute inset-0">
        <Image
          src="/login-bg.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 2600px, 100vw"
          className="object-cover object-center"
          priority
        />
      </div>
      <style>{`
        /* Desktop: a roda do zodíaco fica grandona, quase da borda de cima à de baixo da tela.
           Medidas na imagem original (1672x941): a roda vai de y=135 a y=778 (643px), centro y=456.5,
           e termina em x=747. --wh = altura da roda na tela:
           - 92vh: quase a altura toda
           - 1000px: teto (tamanho numa tela Full HD); em telas maiores não estica mais, o resto é a cor de fundo
           - (92vw - 488px) / 1.162: nunca passa por baixo da caixa de login (caixa 448px + folga 40px) */
        @media (min-width: 1024px) {
          .login-bg {
            --wh: min(92vh, 1000px, calc((92vw - 488px) / 1.162));
            inset: auto;
            left: 0;
            top: calc(50% - var(--wh) * 456.5 / 643);
            height: calc(var(--wh) * 941 / 643);
            aspect-ratio: 1672 / 941;
            /* bordas esfumadas na cor de fundo (#15102a), sem atingir a roda */
            -webkit-mask-image: linear-gradient(to right, #000 55%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
            -webkit-mask-composite: source-in;
            mask-image: linear-gradient(to right, #000 55%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%);
            mask-composite: intersect;
          }
        }
      `}</style>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1
            className={`${logoFont.className} text-5xl sm:text-6xl font-semibold text-white tracking-wide drop-shadow-[0_2px_18px_rgba(168,85,247,0.6)]`}
          >
            Mística Agenda
          </h1>
          <p className="text-purple-200 mt-2">Gerencie seus atendimentos</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-6">Entrar na conta</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-purple-200 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-200 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 pr-11 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 transition-colors"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-purple-300 text-sm mt-6">
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-white hover:underline font-medium">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
