import { Type, type Static } from 'typebox';

export const TrafficSeedStatementSchema = Type.Object({
  statement: Type.Object({
    sql: Type.String(),
    args: Type.Array(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  }),
  rows: Type.Integer({ minimum: 1 }),
  bytes: Type.Integer({ minimum: 1 }),
});

export type TrafficSeedStatement = Static<typeof TrafficSeedStatementSchema>;
