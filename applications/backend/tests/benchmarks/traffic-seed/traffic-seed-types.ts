import { Type, type Static } from 'typebox';

export const TrafficSeedOptionsSchema = Type.Object(
  {
    target: Type.Union([Type.Literal('local'), Type.Literal('remote')]),
    runIdentifier: Type.String({ pattern: '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$' }),
    sessions: Type.Integer({ minimum: 1, maximum: 100000 }),
    days: Type.Integer({ minimum: 1, maximum: 90 }),
    seed: Type.Integer({ minimum: 0, maximum: 4294967295 }),
    output: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export type TrafficSeedOptions = Static<typeof TrafficSeedOptionsSchema>;

export const TrafficSeedCheckpointSchema = Type.Object(
  {
    options: TrafficSeedOptionsSchema,
    anchor: Type.String({ minLength: 20 }),
  },
  { additionalProperties: false },
);

export type TrafficSeedCheckpoint = Static<typeof TrafficSeedCheckpointSchema>;

export const TrafficSeedTimelineOptionsSchema = Type.Object({
  anchor: Type.String(),
  days: Type.Integer({ minimum: 1, maximum: 90 }),
  seed: Type.Integer({ minimum: 0, maximum: 4294967295 }),
});

export type TrafficSeedTimelineOptions = Static<typeof TrafficSeedTimelineOptionsSchema>;

export const TrafficSeedSourceReportSchema = Type.Object({
  retainedDatabase: Type.Object({ path: Type.String({ minLength: 1 }) }),
  options: Type.Object({ sessions: Type.Integer(), seed: Type.Integer() }),
  oracle: Type.Object({ verified: Type.Literal(true) }),
  database: Type.Object({ sessions: Type.Integer(), events: Type.Integer() }),
});

export type TrafficSeedSourceReport = Static<typeof TrafficSeedSourceReportSchema>;
