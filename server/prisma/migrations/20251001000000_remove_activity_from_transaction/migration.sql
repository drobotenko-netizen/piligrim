-- CreateTable: Remove activity column from Transaction
-- Activity is now determined by Category.activity

-- Step 1: Create new table without activity column
CREATE TABLE "Transaction_new" (
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
    "method" TEXT,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "source" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 2: Copy data (excluding activity column)
INSERT INTO "Transaction_new" (
    "id", "tenantId", "kind", "paymentDate", "accrualYear", "accrualMonth", 
    "accountId", "fromAccountId", "toAccountId", "categoryId", "employeeId", 
    "counterpartyId", "method", "amount", "note", "source", 
    "createdBy", "updatedBy", "createdAt", "updatedAt"
)
SELECT 
    "id", "tenantId", "kind", "paymentDate", "accrualYear", "accrualMonth", 
    "accountId", "fromAccountId", "toAccountId", "categoryId", "employeeId", 
    "counterpartyId", "method", "amount", "note", "source", 
    "createdBy", "updatedBy", "createdAt", "updatedAt"
FROM "Transaction";

-- Step 3: Drop old table
DROP TABLE "Transaction";

-- Step 4: Rename new table
ALTER TABLE "Transaction_new" RENAME TO "Transaction";

-- Step 5: Recreate indexes
CREATE INDEX "Transaction_paymentDate_idx" ON "Transaction"("paymentDate");
CREATE INDEX "Transaction_accrualYear_accrualMonth_idx" ON "Transaction"("accrualYear", "accrualMonth");
CREATE INDEX "Transaction_kind_idx" ON "Transaction"("kind");
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

