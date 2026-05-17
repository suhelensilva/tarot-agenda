"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"

export default function CadastroPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const passwordsMatch = confirm.length > 0 && form.password === confirm
  const passwordsDiffer = confirm.length > 0 && form.password !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.password !== confirm) {
      setError("As senhas não coincidem")
      return
    }

    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Erro ao criar conta")
      setLoading(false)
      return
    }

    router.push("/login?cadastro=ok")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔮</div>
          <h1 className="text-3xl font-bold text-white">Mística Agenda</h1>
          <p className="text-purple-300 mt-1">Comece grátis hoje</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-6">Criar conta</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-purple-200 mb-1">Seu nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Maria Silva"
              />
            </div>

            <div>
              <label className="block text-sm text-purple-200 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 pr-11 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Mínimo 6 caracteres"
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

            <div>
              <label className="block text-sm text-purple-200 mb-1">Confirmar senha</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className={`w-full bg-white/10 border rounded-lg px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-colors ${
                    passwordsDiffer
                      ? "border-red-400 focus:ring-red-400"
                      : passwordsMatch
                      ? "border-green-400 focus:ring-green-400"
                      : "border-white/20 focus:ring-purple-400"
                  }`}
                  placeholder="Repita a senha"
                />
              </div>

              {/* Barra de status */}
              {confirm.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/20">
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordsMatch ? "w-full bg-green-400" : "w-full bg-red-400"
                      }`}
                    />
                  </div>
                  {passwordsMatch ? (
                    <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                      <CheckCircle size={13} /> Senhas iguais
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                      <XCircle size={13} /> Senhas diferentes
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || passwordsDiffer || confirm.length === 0}
              className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 transition-colors"
            >
              {loading ? "Criando conta..." : "Criar conta grátis"}
            </button>
          </form>

          <p className="text-center text-purple-300 text-sm mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-white hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
