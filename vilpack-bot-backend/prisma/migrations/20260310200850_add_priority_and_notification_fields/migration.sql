-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "segment" TEXT,
    "companyName" TEXT,
    "interestSummary" TEXT,
    "productsOfInterest" TEXT,
    "internalNotes" TEXT,
    "leadSource" TEXT NOT NULL DEFAULT 'chat_vik',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "followUpAt" TIMESTAMP(3),
    "qualificationScore" INTEGER NOT NULL DEFAULT 0,
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadConversationSummary" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "summary" TEXT,
    "needDescription" TEXT,
    "detectedIntent" TEXT,
    "nextRecommendedAction" TEXT,
    "lastAiUpdateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_sessionId_key" ON "Lead"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadConversationSummary_leadId_key" ON "LeadConversationSummary"("leadId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadConversationSummary" ADD CONSTRAINT "LeadConversationSummary_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
