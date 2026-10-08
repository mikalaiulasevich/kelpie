import { Type, type Static } from 'typebox';

export const TrafficOptionsSchema = Type.Object({
  sessions: Type.Integer({ minimum: 1, maximum: 100000 }),
  concurrency: Type.Integer({ minimum: 1, maximum: 32 }),
  seed: Type.Integer({ minimum: 0, maximum: 4294967295 }),
  output: Type.String({ minLength: 1 }),
});

export type TrafficOptions = Static<typeof TrafficOptionsSchema>;
