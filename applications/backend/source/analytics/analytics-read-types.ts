import type { Prisma } from '../../generated/prisma/client.js';
import type { AnalyticsQuery } from './analytics-types.js';

export type AnalyticsExperimentPlan = Prisma.ExperimentPlanGetPayload<{
  include: { version: { select: { document: true } } };
}>;

export type AnalyticsPublication = Prisma.PublicationGetPayload<{
  select: { createdAt: true; targetVersionIdentifier: true; revision: true; action: true };
}>;

export interface AnalyticsInsightsReadPlan {
  readonly query: AnalyticsQuery;
  readonly now: Date;
  readonly previous: Optional<AnalyticsQuery>;
  readonly publications: readonly AnalyticsPublication[];
  readonly experiments: readonly AnalyticsExperimentPlan[];
  readonly statements: readonly Prisma.Sql[];
}
