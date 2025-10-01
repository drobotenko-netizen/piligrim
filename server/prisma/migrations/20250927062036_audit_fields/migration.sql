-- AlterTable
ALTER TABLE "Account" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Account" ADD COLUMN "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Category" ADD COLUMN "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Counterparty" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Counterparty" ADD COLUMN "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Payout" ADD COLUMN "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Statement" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Statement" ADD COLUMN "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "StatementLine" ADD COLUMN "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "updatedBy" TEXT;
