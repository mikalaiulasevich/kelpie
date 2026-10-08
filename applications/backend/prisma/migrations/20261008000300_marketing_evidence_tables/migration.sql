-- The earlier business_outcomes migration was empty; preserve its checksum.
CREATE TABLE "BusinessOutcome" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "externalIdentifier" TEXT NOT NULL,
    "sessionIdentifier" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "administratorIdentifier" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessOutcome_sessionIdentifier_fkey" FOREIGN KEY ("sessionIdentifier") REFERENCES "Session" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "BusinessOutcome_administratorIdentifier_fkey" FOREIGN KEY ("administratorIdentifier") REFERENCES "Administrator" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "BusinessOutcome_source_externalIdentifier_key" ON "BusinessOutcome"("source", "externalIdentifier");
CREATE INDEX "BusinessOutcome_sessionIdentifier_occurredAt_kind_idx" ON "BusinessOutcome"("sessionIdentifier", "occurredAt", "kind");
CREATE TABLE "ExperimentPlan" (
    "versionIdentifier" TEXT NOT NULL PRIMARY KEY,
    "hypothesis" TEXT NOT NULL,
    "primaryMetric" TEXT NOT NULL,
    "targetSamplePerVariant" INTEGER NOT NULL,
    "plannedEndAt" DATETIME NOT NULL,
    "administratorIdentifier" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentPlan_versionIdentifier_fkey" FOREIGN KEY ("versionIdentifier") REFERENCES "FunnelVersion" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "ExperimentPlan_administratorIdentifier_fkey" FOREIGN KEY ("administratorIdentifier") REFERENCES "Administrator" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);
