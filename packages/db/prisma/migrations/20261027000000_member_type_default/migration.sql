-- Member type is no longer asked at sign-up; keep the column, give it a default
ALTER TABLE "Member" ALTER COLUMN "memberType" SET DEFAULT 'FRIEND';
