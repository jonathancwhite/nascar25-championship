-- AlterEnum
ALTER TYPE "EmailType" ADD VALUE 'LEAGUE_INVITE';

-- AlterTable
ALTER TABLE "LeagueMembership" ADD COLUMN     "notifyByEmail" BOOLEAN NOT NULL DEFAULT true;
