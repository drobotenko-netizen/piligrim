/*
  Warnings:

  - You are about to drop the column `counterparty` on the `Transaction` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Counterparty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Counterparty_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "accrualYear" INTEGER,
    "accrualMonth" INTEGER,
    "accountId" TEXT,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "categoryId" TEXT,
    "employeeId" TEXT,
    "counterpartyId" TEXT,
    "activity" TEXT,
    "method" TEXT,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "accrualMonth", "accrualYear", "activity", "amount", "categoryId", "createdAt", "employeeId", "fromAccountId", "id", "kind", "method", "note", "paymentDate", "source", "tenantId", "toAccountId", "updatedAt") SELECT "accountId", "accrualMonth", "accrualYear", "activity", "amount", "categoryId", "createdAt", "employeeId", "fromAccountId", "id", "kind", "method", "note", "paymentDate", "source", "tenantId", "toAccountId", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_paymentDate_idx" ON "Transaction"("paymentDate");
CREATE INDEX "Transaction_accrualYear_accrualMonth_idx" ON "Transaction"("accrualYear", "accrualMonth");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
