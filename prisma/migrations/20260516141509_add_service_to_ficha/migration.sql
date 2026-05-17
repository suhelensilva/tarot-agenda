-- AlterTable
ALTER TABLE "fichas" ADD COLUMN     "serviceId" TEXT;

-- AddForeignKey
ALTER TABLE "fichas" ADD CONSTRAINT "fichas_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
