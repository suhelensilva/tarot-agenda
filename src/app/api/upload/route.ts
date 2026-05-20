import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"
import { getPlanLimits } from "@/lib/plan"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[upload] Missing env vars:", { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey })
    return NextResponse.json({ error: "Variáveis de ambiente do Storage não configuradas no servidor." }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "uploads"

    // Fotos de serviço só para PRO+
    if (folder === "servicos") {
      const limits = getPlanLimits(session.user.plan)
      if (!limits.servicePhotos) {
        return NextResponse.json(
          { error: "Fotos nos serviços disponíveis a partir do plano Pró.", code: "PLAN_LIMIT" },
          { status: 403 }
        )
      }
    }

    if (!file) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 })

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Imagem muito grande. Máximo 5MB." },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop()
    const fileName = `${session.user.id}/${folder}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from("imagens")
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (error) {
      console.error("[upload] Supabase error:", error)
      return NextResponse.json({ error: `Erro Storage: ${error.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from("imagens").getPublicUrl(fileName)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error("[upload POST] Unexpected error:", err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Erro ao enviar imagem: ${msg}` }, { status: 500 })
  }
}
