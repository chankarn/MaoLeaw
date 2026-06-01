-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PROMPTPAY', 'BANK');
CREATE TYPE "BankCode" AS ENUM ('BBL', 'KBANK', 'KTB', 'SCB', 'BAY', 'TTB', 'GSB', 'BAAC', 'GHB', 'UOB', 'CIMB', 'LHB', 'TISCO', 'KKP');

-- AlterTable Bill: add payment fields
ALTER TABLE "Bill"
  ADD COLUMN "paymentType"       "PaymentType" NOT NULL DEFAULT 'PROMPTPAY',
  ADD COLUMN "promptpayId"       VARCHAR(15),
  ADD COLUMN "bankCode"          "BankCode",
  ADD COLUMN "bankAccountNumber" VARCHAR(30),
  ADD COLUMN "bankAccountName"   VARCHAR(100);

-- AlterTable Event: drop customPromptpayId
ALTER TABLE "Event" DROP COLUMN IF EXISTS "customPromptpayId";

-- AlterTable AppConfig: drop promptpayIdOverride
ALTER TABLE "AppConfig" DROP COLUMN IF EXISTS "promptpayIdOverride";
