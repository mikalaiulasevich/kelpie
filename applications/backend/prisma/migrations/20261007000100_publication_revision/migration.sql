-- Preserve existing activation history; rowid breaks timestamp ties in insertion order.
ALTER TABLE "Publication" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
WITH ordered_publications AS (
  SELECT "identifier", ROW_NUMBER() OVER (
    PARTITION BY "funnelIdentifier" ORDER BY "createdAt", rowid
  ) AS activation_revision FROM "Publication"
)
UPDATE "Publication" SET "revision" = (
  SELECT activation_revision FROM ordered_publications
  WHERE ordered_publications."identifier" = "Publication"."identifier"
);
UPDATE "Funnel" SET "revision" = MAX("revision", COALESCE((
  SELECT MAX("revision") FROM "Publication"
  WHERE "Publication"."funnelIdentifier" = "Funnel"."identifier"
), 0));
CREATE UNIQUE INDEX "Publication_funnelIdentifier_revision_key"
  ON "Publication"("funnelIdentifier", "revision");
