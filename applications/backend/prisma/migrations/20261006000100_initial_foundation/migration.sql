-- CreateTable
CREATE TABLE "Funnel" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "activeVersionIdentifier" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Funnel_identifier_activeVersionIdentifier_fkey" FOREIGN KEY ("identifier", "activeVersionIdentifier") REFERENCES "FunnelVersion" ("funnelIdentifier", "identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "FunnelVersion" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "funnelIdentifier" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FunnelVersion_funnelIdentifier_fkey" FOREIGN KEY ("funnelIdentifier") REFERENCES "Funnel" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "Publication" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "operationIdentifier" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "funnelIdentifier" TEXT NOT NULL,
    "targetVersionIdentifier" TEXT NOT NULL,
    "previousVersionIdentifier" TEXT,
    "administratorIdentifier" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Publication_funnelIdentifier_fkey" FOREIGN KEY ("funnelIdentifier") REFERENCES "Funnel" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "Publication_funnelIdentifier_targetVersionIdentifier_fkey" FOREIGN KEY ("funnelIdentifier", "targetVersionIdentifier") REFERENCES "FunnelVersion" ("funnelIdentifier", "identifier") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "Publication_funnelIdentifier_previousVersionIdentifier_fkey" FOREIGN KEY ("funnelIdentifier", "previousVersionIdentifier") REFERENCES "FunnelVersion" ("funnelIdentifier", "identifier") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "Publication_administratorIdentifier_fkey" FOREIGN KEY ("administratorIdentifier") REFERENCES "Administrator" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "Session" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "accessTokenHash" TEXT,
    "versionIdentifier" TEXT NOT NULL,
    "experimentIdentifier" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "assignmentSource" TEXT NOT NULL,
    "trafficOrigin" TEXT NOT NULL,
    "acquisitionParameters" JSONB NOT NULL,
    "campaign" TEXT,
    "currentStepIdentifier" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_versionIdentifier_fkey" FOREIGN KEY ("versionIdentifier") REFERENCES "FunnelVersion" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "SessionAnswer" (
    "sessionIdentifier" TEXT NOT NULL,
    "stepIdentifier" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("sessionIdentifier", "stepIdentifier"),
    CONSTRAINT "SessionAnswer_sessionIdentifier_fkey" FOREIGN KEY ("sessionIdentifier") REFERENCES "Session" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "SessionOperation" (
    "operationIdentifier" TEXT NOT NULL PRIMARY KEY,
    "sessionIdentifier" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionOperation_sessionIdentifier_fkey" FOREIGN KEY ("sessionIdentifier") REFERENCES "Session" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "Event" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "contentFingerprint" TEXT NOT NULL,
    "sessionIdentifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "clientTimestamp" DATETIME NOT NULL,
    "serverTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stepIdentifier" TEXT,
    "properties" JSONB NOT NULL,
    CONSTRAINT "Event_sessionIdentifier_fkey" FOREIGN KEY ("sessionIdentifier") REFERENCES "Session" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "Administrator" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AdministratorSession" (
    "identifier" TEXT NOT NULL PRIMARY KEY,
    "accessTokenHash" TEXT NOT NULL,
    "administratorIdentifier" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    CONSTRAINT "AdministratorSession_administratorIdentifier_fkey" FOREIGN KEY ("administratorIdentifier") REFERENCES "Administrator" ("identifier") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_activeVersionIdentifier_key" ON "Funnel"("activeVersionIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_identifier_activeVersionIdentifier_key" ON "Funnel"("identifier", "activeVersionIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelVersion_funnelIdentifier_version_key" ON "FunnelVersion"("funnelIdentifier", "version");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelVersion_funnelIdentifier_identifier_key" ON "FunnelVersion"("funnelIdentifier", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_operationIdentifier_key" ON "Publication"("operationIdentifier");

-- CreateIndex
CREATE INDEX "Publication_funnelIdentifier_createdAt_idx" ON "Publication"("funnelIdentifier", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_accessTokenHash_key" ON "Session"("accessTokenHash");

-- CreateIndex
CREATE INDEX "Session_versionIdentifier_variant_createdAt_idx" ON "Session"("versionIdentifier", "variant", "createdAt");

-- CreateIndex
CREATE INDEX "Session_campaign_createdAt_idx" ON "Session"("campaign", "createdAt");

-- CreateIndex
CREATE INDEX "Session_trafficOrigin_assignmentSource_createdAt_idx" ON "Session"("trafficOrigin", "assignmentSource", "createdAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "SessionOperation_sessionIdentifier_createdAt_idx" ON "SessionOperation"("sessionIdentifier", "createdAt");

-- CreateIndex
CREATE INDEX "Event_sessionIdentifier_name_stepIdentifier_idx" ON "Event"("sessionIdentifier", "name", "stepIdentifier");

-- CreateIndex
CREATE INDEX "Event_name_stepIdentifier_sessionIdentifier_idx" ON "Event"("name", "stepIdentifier", "sessionIdentifier");

-- CreateIndex
CREATE INDEX "Event_serverTimestamp_idx" ON "Event"("serverTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Administrator_username_key" ON "Administrator"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AdministratorSession_accessTokenHash_key" ON "AdministratorSession"("accessTokenHash");

-- CreateIndex
CREATE INDEX "AdministratorSession_expiresAt_idx" ON "AdministratorSession"("expiresAt");
