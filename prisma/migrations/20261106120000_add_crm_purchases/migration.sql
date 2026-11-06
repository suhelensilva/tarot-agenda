-- AlterTable: coluna do token da extensão CRM
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apiToken" TEXT;

-- CreateTable: compras
CREATE TABLE IF NOT EXISTS "purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "productName" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "ctwaClid" TEXT,
    "metaEventSent" BOOLEAN NOT NULL DEFAULT false,
    "metaEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_apiToken_key" ON "users"("apiToken");
CREATE INDEX IF NOT EXISTS "purchases_userId_clientId_idx" ON "purchases"("userId", "clientId");
CREATE INDEX IF NOT EXISTS "purchases_clientId_purchasedAt_idx" ON "purchases"("clientId", "purchasedAt");

-- AddForeignKey (ignora se já existir)
DO $$ BEGIN
  ALTER TABLE "purchases" ADD CONSTRAINT "purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "purchases" ADD CONSTRAINT "purchases_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
