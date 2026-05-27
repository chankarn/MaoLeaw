-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CLAIMED';

-- AlterTable
ALTER TABLE "BillShare" ADD COLUMN     "claimNote" TEXT,
ADD COLUMN     "claimedAt" TIMESTAMPTZ(6);
