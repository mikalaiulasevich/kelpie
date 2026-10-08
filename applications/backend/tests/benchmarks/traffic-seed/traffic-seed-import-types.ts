import type { Prisma } from '../../../generated/prisma/client.js';
import { Type, type Static } from 'typebox';

export type TrafficSeedSessionGraph = Prisma.SessionGetPayload<{
  include: { answers: true; operations: true; transitions: true; events: true; version: true };
}>;

export interface TrafficSeedImportOptions {
  runIdentifier: string;
  projectSession: (session: TrafficSeedSessionGraph, ordinal: number) => TrafficSeedSessionGraph;
  prepareGraphs?: (graphs: readonly TrafficSeedSessionGraph[]) => () => Promise<void>;
}

export interface TrafficSeedPreparedRecords {
  sessions: Prisma.SessionCreateManyInput[];
  answers: Prisma.SessionAnswerCreateManyInput[];
  operations: Prisma.SessionOperationCreateManyInput[];
  transitions: Prisma.SessionTransitionCreateManyInput[];
  events: Prisma.EventCreateManyInput[];
}

export const TrafficSeedImportReceiptSchema = Type.Object({
  runIdentifier: Type.String({ minLength: 1 }),
  sessions: Type.Integer({ minimum: 0 }),
  inserted: Type.Integer({ minimum: 0 }),
  existing: Type.Integer({ minimum: 0 }),
  events: Type.Integer({ minimum: 0 }),
});

export type TrafficSeedImportReceipt = Static<typeof TrafficSeedImportReceiptSchema>;
