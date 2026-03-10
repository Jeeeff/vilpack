-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "lastLeadContextHash" TEXT,
ADD COLUMN     "lastLeadExtractionAt" TIMESTAMP(3);
