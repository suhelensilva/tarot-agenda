"use client"

import { useEffect, useState } from "react"
import { Cake, Download, Send, X } from "lucide-react"

// Envio MANUAL dos parabéns: mostra a imagem personalizada (com o primeiro nome da cliente)
// e a mensagem; ao clicar, a taróloga manda pelo próprio WhatsApp. Nada é disparado sozinho.

function primeiroNome(nome: string) {
  const first = nome.trim().split(/\s+/)[0] ?? ""
  return first
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|[-'])(\p{L})/gu, (_, sep, l) => sep + l.toLocaleUpperCase("pt-BR"))
}

function waNumber(phone: string) {
  const d = phone.replace(/\D/g, "")
  return d.length === 10 || d.length === 11 ? "55" + d : d
}

export function BirthdaySendButton({ name, phone, template, senderName }: { name: string; phone: string; template: string; senderName: string }) {
  const [open, setOpen] = useState(false)
  const first = primeiroNome(name)
  const imageUrl = `/api/aniversario/imagem?nome=${encodeURIComponent(name)}`
  const [message, setMessage] = useState("")
  const [hint, setHint] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open) return
    setMessage(template.replace(/\{nome\}/gi, name).replace(/\{primeiro_nome\}/gi, first).replace(/\{meu_nome\}/gi, senderName))
    setHint("")
  }, [open, template, name, first, senderName])

  const fileName = `parabens-${first.toLowerCase()}.png`
  const getBlob = () => fetch(imageUrl).then((r) => r.blob())

  async function send() {
    // Celular: compartilhar imagem + texto direto (escolhe o WhatsApp na lista)
    const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    if (isTouch && navigator.canShare) {
      try {
        const file = new File([await getBlob()], fileName, { type: "image/png" })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: message })
          return
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
      }
    }

    // Computador: copia a imagem e abre a conversa com o texto já escrito
    let copied: Promise<void> | null = null
    try {
      copied = navigator.clipboard.write([new ClipboardItem({ "image/png": getBlob() })])
    } catch { copied = null }
    window.open(`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(message)}`, "_blank", "noopener")
    try {
      if (!copied) throw new Error()
      await copied
      setHint("Imagem copiada! Na conversa que abriu, aperte Ctrl+V para colar a imagem e envie.")
    } catch {
      setHint("Não consegui copiar a imagem. Use \"Baixar imagem\" e anexe na conversa.")
    }
  }

  async function download() {
    const url = URL.createObjectURL(await getBlob())
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-medium text-pink-600 dark:text-pink-400 hover:text-pink-500 border border-pink-200 dark:border-pink-500/30 hover:border-pink-400 rounded-md px-2 py-1 shrink-0 transition-colors bg-white dark:bg-transparent"
      >
        <Cake size={12} /> Parabéns
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.2)] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Parabéns para {name}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-[minmax(0,260px)_1fr] gap-5">
              <div className="relative aspect-[1333/2000] rounded-xl overflow-hidden bg-pink-50 dark:bg-pink-500/10">
                {!loaded && <div className="absolute inset-0 flex items-center justify-center text-xs text-pink-400">Gerando imagem...</div>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={`Imagem de parabéns para ${first}`} onLoad={() => setLoaded(true)} className="w-full h-full object-cover" />
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mensagem que vai junto</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={7}
                    className="w-full border border-gray-200 dark:border-[rgba(170,85,249,0.2)] dark:bg-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">WhatsApp: {phone}</p>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={send}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Send size={14} /> Enviar no WhatsApp
                  </button>
                  <button
                    onClick={download}
                    className="flex items-center gap-1.5 border border-gray-200 dark:border-[rgba(170,85,249,0.25)] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download size={14} /> Baixar imagem
                  </button>
                </div>
                {hint && <p className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-lg p-2.5">{hint}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
