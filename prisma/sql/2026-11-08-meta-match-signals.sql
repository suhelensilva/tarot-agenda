-- Sinais de correspondência da Meta capturados no agendamento público.
-- Rodar no SQL Editor do Supabase ANTES de usar o novo fluxo.
-- Colunas em camelCase (como o Prisma cria), por isso entre aspas.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS "fbp" TEXT,
  ADD COLUMN IF NOT EXISTS "fbc" TEXT,
  ADD COLUMN IF NOT EXISTS "clientIp" TEXT,
  ADD COLUMN IF NOT EXISTS "clientUserAgent" TEXT;
