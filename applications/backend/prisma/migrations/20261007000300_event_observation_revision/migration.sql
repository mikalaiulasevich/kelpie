BEGIN IMMEDIATE;

-- Client observations bind to committed state; existing server events need no observation revision.
ALTER TABLE "Event" ADD COLUMN "observationRevision" INTEGER;

COMMIT;
