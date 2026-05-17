-- CreateEnum
CREATE TYPE "FichaType" AS ENUM ('INTERNAL', 'REPORT');

-- CreateTable
CREATE TABLE "fichas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "FichaType" NOT NULL,
    "mainSubject" TEXT,
    "productName" TEXT,
    "logoUrl" TEXT,
    "backgroundUrl" TEXT,
    "involvedPeople" JSONB NOT NULL DEFAULT '[]',
    "mainComplaint" TEXT,
    "complaintText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fichas" ADD CONSTRAINT "fichas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas" ADD CONSTRAINT "fichas_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
