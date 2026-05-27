-- AlterTable: rename column to preserve any existing data
ALTER TABLE "Event" RENAME COLUMN "customQrUrl" TO "customPromptpayId";
