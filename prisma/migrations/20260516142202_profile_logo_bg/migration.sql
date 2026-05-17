/*
  Warnings:

  - You are about to drop the column `backgroundUrl` on the `fichas` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `fichas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fichas" DROP COLUMN "backgroundUrl",
DROP COLUMN "logoUrl",
ADD COLUMN     "removeBg" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "reportBg" TEXT;
