/*
  Warnings:

  - You are about to drop the column `observacao` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `produto` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `quantidade` on the `ChatSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChatSession" DROP COLUMN "observacao",
DROP COLUMN "produto",
DROP COLUMN "quantidade",
ADD COLUMN     "cart" JSONB,
ADD COLUMN     "tempData" JSONB;
