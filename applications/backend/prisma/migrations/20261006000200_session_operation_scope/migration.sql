-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE "new_SessionOperation" (
    "operationIdentifier" TEXT NOT NULL,
    "sessionIdentifier" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("sessionIdentifier", "operationIdentifier"),
    CONSTRAINT "SessionOperation_sessionIdentifier_fkey" FOREIGN KEY ("sessionIdentifier") REFERENCES "Session" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);
INSERT INTO "new_SessionOperation" ("createdAt", "operationIdentifier", "requestFingerprint", "response", "sessionIdentifier") SELECT "createdAt", "operationIdentifier", "requestFingerprint", "response", "sessionIdentifier" FROM "SessionOperation";
DROP TABLE "SessionOperation";
ALTER TABLE "new_SessionOperation" RENAME TO "SessionOperation";
CREATE INDEX "SessionOperation_sessionIdentifier_createdAt_idx" ON "SessionOperation"("sessionIdentifier", "createdAt");
COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
