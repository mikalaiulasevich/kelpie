-- Cover per-session analytics probes without fetching Event rows for source, timestamp, or step.
-- Preserve the existing indexes used by other event and observation queries.
CREATE INDEX "Event_sessionIdentifier_name_source_serverTimestamp_stepIdentifier_idx"
ON "Event"("sessionIdentifier", "name", "source", "serverTimestamp", "stepIdentifier");
