/*
  Warnings:

  - Added the required column `kind` to the `Position` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Position" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseHourRate" INTEGER,
    "kind" TEXT NOT NULL,
    "revenuePercentBps" INTEGER,
    "salaryAmount" INTEGER,
    CONSTRAINT "Position_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Position" ("baseHourRate", "id", "name", "tenantId") SELECT "baseHourRate", "id", "name", "tenantId" FROM "Position";
DROP TABLE "Position";
ALTER TABLE "new_Position" RENAME TO "Position";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
