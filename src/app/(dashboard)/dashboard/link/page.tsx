import { auth } from "@/lib/auth"
import { Copy, ExternalLink } from "lucide-react"
import CopyButton from "@/components/copy-button"

export default async function LinkPage() {
  const session = await auth()
  const userId = session!.user.id
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const link = `${baseUrl}/agendar/${userId}`

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Link Público</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Compartilhe este link para seus clientes agendarem sozinhos</p>
      </div>

      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Seu link de agendamento</p>
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] border border-gray-200 dark:border-[rgba(170,85,249,0.12)] rounded-lg p-3">
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate font-mono">{link}</span>
          <CopyButton text={link} />
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-600 dark:hover:text-[#aa55f9] transition-colors">
            <ExternalLink size={16} />
          </a>
        </div>

        <div className="mt-4 p-4 bg-purple-50 dark:bg-[rgba(170,85,249,0.08)] border border-purple-100 dark:border-[rgba(170,85,249,0.2)] rounded-lg text-sm text-purple-700 dark:text-[#aa55f9]">
          <p className="font-medium mb-1">Como funciona:</p>
          <ol className="list-decimal list-inside space-y-1 text-purple-600 dark:text-purple-300">
            <li>Sua cliente clica no link</li>
            <li>Escolhe o serviço</li>
            <li>Seleciona o dia e horário disponível</li>
            <li>Informa nome e WhatsApp</li>
            <li>Agendamento aparece direto na sua agenda</li>
          </ol>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          Configure os dias e horários disponíveis em <strong className="dark:text-gray-400">Configurações → Horários disponíveis</strong>
        </p>
      </div>

      <div className="bg-white dark:bg-[#13131f] border border-gray-200 dark:border-[rgba(170,85,249,0.15)] rounded-xl p-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cole onde quiser</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Bio do Instagram, stories, mensagens, cartão de visita digital — onde sua cliente puder clicar.</p>
      </div>
    </div>
  )
}
