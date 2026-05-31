-- AlterTable: drop opt-in flag, no longer needed (admin controls inclusion per-item)
ALTER TABLE "Submission" DROP COLUMN "sharesMixer";

-- AlterTable: per-item explicit extras (union with type default)
ALTER TABLE "BillItem" ADD COLUMN "extraMemberIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
