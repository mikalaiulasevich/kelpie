import { Type, type Static } from 'typebox';

export const TrafficOptionsSchema = Type.Object({
  sessions: Type.Integer({ minimum: 1, maximum: 100000 }),
  concurrency: Type.Integer({ minimum: 1, maximum: 32 }),
  seed: Type.Integer({ minimum: 0, maximum: 4294967295 }),
  output: Type.String({ minLength: 1 }),
  resume: Type.Optional(Type.String({ minLength: 1 })),
  database: Type.Optional(Type.String({ minLength: 1 })),
});

export type TrafficOptions = Static<typeof TrafficOptionsSchema>;

export const TrafficLoadMeasurementSchema = Type.Object({
  elapsedMilliseconds: Type.Number({ minimum: 0 }),
  processorMicroseconds: Type.Object({ user: Type.Number(), system: Type.Number() }),
  peakResidentBytes: Type.Number({ minimum: 0 }),
  traffic: Type.Record(
    Type.String(),
    Type.Object({
      requests: Type.Integer({ minimum: 0 }),
      statuses: Type.Record(Type.String(), Type.Number()),
      p50: Type.Number(),
      p95: Type.Number(),
      p99: Type.Number(),
      maximum: Type.Number(),
    }),
  ),
});

export type TrafficLoadMeasurement = Static<typeof TrafficLoadMeasurementSchema>;

export const TrafficGenerationCheckpointSchema = Type.Object({
  measurement: TrafficLoadMeasurementSchema,
  provenance: Type.Object({
    options: TrafficOptionsSchema,
    recordedAt: Type.String(),
    nodeRuntime: Type.String(),
    bunRuntime: Type.Union([Type.String(), Type.Null()]),
    operatingSystem: Type.String(),
    processor: Type.String(),
    logicalProcessors: Type.Integer(),
    systemMemoryBytes: Type.Number(),
  }),
});

export type TrafficGenerationCheckpoint = Static<typeof TrafficGenerationCheckpointSchema>;
