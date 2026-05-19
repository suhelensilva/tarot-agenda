import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "uploads"

    if (!file) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 })

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Imagem muito grande. O tamanho máximo é 5MB. Reduza o tamanho e tente novamente." },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop()
    const fileName = `${session.user.id}/${folder}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from("images")
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (error) throw error

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error("[upload POST]", err)
    const msg = err instanceof Error ? err.message : String(err)
    const friendly = msg.toLowerCase().includes("bucket")
      ? "Erro de configuração no armazenamento. Contate o suporte."
      : "Erro ao enviar imagem. Tente novamente."
    return NextResponse.json({ error: friendly }, { status: 500 })
  }
}
