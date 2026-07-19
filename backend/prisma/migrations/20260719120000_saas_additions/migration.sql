-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'TRIAL');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- AlterTable: Pharmacy
ALTER TABLE "Pharmacy" ADD COLUMN "ownerName" TEXT;
ALTER TABLE "Pharmacy" ADD COLUMN "email" TEXT;
ALTER TABLE "Pharmacy" ADD COLUMN "phone" TEXT;
ALTER TABLE "Pharmacy" ADD COLUMN "country" TEXT;
ALTER TABLE "Pharmacy" ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Pharmacy" ADD COLUMN "subscriptionStartDate" TIMESTAMP(3);
ALTER TABLE "Pharmacy" ADD COLUMN "subscriptionExpiryDate" TIMESTAMP(3);

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "country" TEXT;
ALTER TABLE "User" ADD COLUMN "tempPasswordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
