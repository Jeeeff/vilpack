-- Migration: add vitrine fields to Product
-- Apply with: npx prisma migrate deploy

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "showInVitrine"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "vitrineSegment" TEXT,
  ADD COLUMN IF NOT EXISTS "vitrineTags"    TEXT,
  ADD COLUMN IF NOT EXISTS "vitrineOrder"   INTEGER NOT NULL DEFAULT 0;
