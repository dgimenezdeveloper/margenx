-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
