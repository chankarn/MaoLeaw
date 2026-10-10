-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'CASH');

-- AlterTable Member: walk-in guests added by an admin (no LINE account)
ALTER TABLE "Member" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable BillShare: how a PAID share was settled
ALTER TABLE "BillShare" ADD COLUMN "paidVia" "PaymentMethod";

-- Slip-verified payments so far were transfers
UPDATE "BillShare" SET "paidVia" = 'TRANSFER' WHERE "paymentStatus" = 'PAID' AND "slipCheck" = 'AUTO_OK';
