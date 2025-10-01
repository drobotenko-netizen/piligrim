-- ===== Cafe Finance Lite v3 Migration =====
-- Добавление моделей для полноценного финансового учёта с долгами и сменами

-- 1. Добавить поле kind в Category
ALTER TABLE "Category" ADD COLUMN "kind" TEXT;

-- 2. Создать справочник каналов продаж
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Channel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 3. Создать справочник способов оплаты
CREATE TABLE "TenderType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TenderType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 4. Создать таблицу смен
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "openAt" DATETIME NOT NULL,
    "closeAt" DATETIME,
    "openedBy" TEXT,
    "closedBy" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Shift_openAt_idx" ON "Shift"("openAt");
CREATE INDEX "Shift_closeAt_idx" ON "Shift"("closeAt");

-- 5. Создать таблицу продаж по сменам
CREATE TABLE "ShiftSale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "tenderTypeId" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "discounts" INTEGER NOT NULL DEFAULT 0,
    "refunds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShiftSale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftSale_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftSale_tenderTypeId_fkey" FOREIGN KEY ("tenderTypeId") REFERENCES "TenderType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ShiftSale_shiftId_idx" ON "ShiftSale"("shiftId");

-- 6. Создать таблицу документов расходов
CREATE TABLE "ExpenseDoc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "vendorId" TEXT,
    "categoryId" TEXT NOT NULL,
    "operationDate" DATETIME NOT NULL,
    "postingPeriod" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "memo" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpenseDoc_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseDoc_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Counterparty" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExpenseDoc_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ExpenseDoc_postingPeriod_idx" ON "ExpenseDoc"("postingPeriod");
CREATE INDEX "ExpenseDoc_status_idx" ON "ExpenseDoc"("status");
CREATE INDEX "ExpenseDoc_vendorId_idx" ON "ExpenseDoc"("vendorId");

-- 7. Создать таблицу платежей
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "expenseDocId" TEXT,
    "accountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "activity" TEXT,
    "memo" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_expenseDocId_fkey" FOREIGN KEY ("expenseDocId") REFERENCES "ExpenseDoc" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Payment_date_idx" ON "Payment"("date");
CREATE INDEX "Payment_expenseDocId_idx" ON "Payment"("expenseDocId");

-- 8. Создать таблицу распределения платежей
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "expenseDocId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentAllocation_expenseDocId_fkey" FOREIGN KEY ("expenseDocId") REFERENCES "ExpenseDoc" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");
CREATE INDEX "PaymentAllocation_expenseDocId_idx" ON "PaymentAllocation"("expenseDocId");

-- 9. Создать таблицу денежных операций
CREATE TABLE "CashTx" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "memo" TEXT,
    "activity" TEXT NOT NULL,
    "matchedStatementLineId" TEXT,
    "paymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashTx_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashTx_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashTx_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CashTx_date_idx" ON "CashTx"("date");
CREATE INDEX "CashTx_activity_idx" ON "CashTx"("activity");
CREATE INDEX "CashTx_direction_idx" ON "CashTx"("direction");
CREATE INDEX "CashTx_accountId_idx" ON "CashTx"("accountId");

