-- Migration: add_lead_ficha_comercial
-- Adiciona campos da Ficha Comercial ao modelo Lead
-- Todos os campos são opcionais (nullable) — compatível com dados existentes

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastPurchaseAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastPurchaseValue" DECIMAL(10,2);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastUnitPrice" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "mainProducts" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "purchaseFrequency" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "avgTicket" DECIMAL(10,2);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "commercialCondition" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "nextAction" TEXT;
