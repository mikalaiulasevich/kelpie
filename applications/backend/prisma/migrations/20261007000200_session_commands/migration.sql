BEGIN IMMEDIATE;

ALTER TABLE "Session" ADD COLUMN "initialState" JSONB;
ALTER TABLE "SessionAnswer" ADD COLUMN "confirmationRevision" INTEGER;
-- Legacy answers remain available as drafts; activation requires explicit confirmation.
CREATE TABLE "SessionTransition" (
  "identifier" TEXT NOT NULL PRIMARY KEY,
  "sessionIdentifier" TEXT NOT NULL,
  "operationIdentifier" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "fromStepIdentifier" TEXT NOT NULL,
  "toStepIdentifier" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionTransition_sessionIdentifier_fkey" FOREIGN KEY ("sessionIdentifier") REFERENCES "Session"("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "SessionTransition_sessionIdentifier_operationIdentifier_fkey" FOREIGN KEY ("sessionIdentifier", "operationIdentifier") REFERENCES "SessionOperation"("sessionIdentifier", "operationIdentifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "SessionTransition_sessionIdentifier_revision_key" ON "SessionTransition"("sessionIdentifier", "revision");
CREATE INDEX "SessionTransition_sessionIdentifier_fromStepIdentifier_kind_idx" ON "SessionTransition"("sessionIdentifier", "fromStepIdentifier", "kind");
CREATE TABLE "ApplicationSecret" (
  "identifier" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
