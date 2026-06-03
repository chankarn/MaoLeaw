-- AlterEnum: add CUSTOM type for admin-selected member split
ALTER TYPE "BillItemType" ADD VALUE 'CUSTOM';

-- AlterTable: per-item explicit custom member list (used only when itemType = CUSTOM)
ALTER TABLE "BillItem" ADD COLUMN "customMemberIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
