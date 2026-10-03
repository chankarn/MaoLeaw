-- CreateEnum
CREATE TYPE "SlipCheck" AS ENUM ('AUTO_OK', 'NEEDS_REVIEW');

-- AlterTable BillShare: slip verification result (image only kept while NEEDS_REVIEW)
ALTER TABLE "BillShare"
  ADD COLUMN "slipCheck"         "SlipCheck",
  ADD COLUMN "slipReviewReason"  TEXT,
  ADD COLUMN "slipTransRef"      TEXT,
  ADD COLUMN "slipAmount"        INTEGER,
  ADD COLUMN "slipTransferredAt" TIMESTAMPTZ(6),
  ADD COLUMN "slipImagePath"     TEXT;

-- One slip can settle only one share
CREATE UNIQUE INDEX "BillShare_slipTransRef_key" ON "BillShare"("slipTransRef");

-- AlterTable AppConfig: SlipOK monthly usage counter (free-tier guard)
ALTER TABLE "AppConfig"
  ADD COLUMN "slipokUsageMonth" TEXT,
  ADD COLUMN "slipokUsageCount" INTEGER NOT NULL DEFAULT 0;
