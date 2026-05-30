-- AlterEnum
ALTER TYPE "BillItemType" ADD VALUE 'MIXER';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "sharesMixer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BillShare" ADD COLUMN "mixerAmount" INTEGER NOT NULL DEFAULT 0;
