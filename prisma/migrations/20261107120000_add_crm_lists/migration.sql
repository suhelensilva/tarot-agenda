-- CreateTable: listas/etiquetas do CRM
CREATE TABLE IF NOT EXISTS "crm_lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_lists_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "crm_lists_userId_idx" ON "crm_lists"("userId");

-- CreateTable: vínculo cliente <-> lista
CREATE TABLE IF NOT EXISTS "crm_list_members" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_list_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "crm_list_members_listId_clientId_key" ON "crm_list_members"("listId", "clientId");
CREATE INDEX IF NOT EXISTS "crm_list_members_clientId_idx" ON "crm_list_members"("clientId");

-- Foreign keys (ignora se já existir)
DO $$ BEGIN
  ALTER TABLE "crm_lists" ADD CONSTRAINT "crm_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "crm_list_members" ADD CONSTRAINT "crm_list_members_listId_fkey" FOREIGN KEY ("listId") REFERENCES "crm_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "crm_list_members" ADD CONSTRAINT "crm_list_members_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
