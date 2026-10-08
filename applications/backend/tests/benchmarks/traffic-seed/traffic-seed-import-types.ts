import type { Prisma } from '../../../generated/prisma/client.js';

export type TrafficSeedSessionGraph = Prisma.SessionGetPayload<{
  include: { answers: true; operations: true; transitions: true; events: true; version: true };
}>;

export interface TrafficSeedImportOptions {
  runIdentifier: string;
  projectSession: (session: TrafficSeedSessionGraph, ordinal: number) => TrafficSeedSessionGraph;
}

export interface TrafficSeedImportReceipt {
  runIdentifier: string;
  sessions: number;
  inserted: number;
  existing: number;
  events: number;
}
