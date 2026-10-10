-- AlterTable Bill: one automatic payment reminder per sent bill
ALTER TABLE "Bill" ADD COLUMN "autoRemindedAt" TIMESTAMPTZ(6);

-- Don't fire a backlog of reminders on deploy: bills already older than the 3-day
-- window count as handled (admins can still press "ทวงเงิน" by hand).
UPDATE "Bill"
SET "autoRemindedAt" = now()
WHERE "status" = 'SENT' AND "sentAt" < now() - interval '3 days';
