import { omit } from 'es-toolkit/object';
import { Prisma } from '../../generated/prisma/client.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import {
  AnalyticsInsightSchemas,
  type AnalyticsAcquisitionOption,
  type AnalyticsAcquisitionOptions,
} from './analytics-insight-types.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsRows } from './analytics-results.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import type { AnalyticsQuery } from './analytics-types.js';

const Columns = {
  source: Prisma.sql`source`,
  medium: Prisma.sql`medium`,
  campaign: Prisma.sql`campaign`,
} as const;
const Validators = {
  option: SchemaCompiler.compile<AnalyticsAcquisitionOption>(
    AnalyticsInsightSchemas.AcquisitionOption,
  ),
} as const;

export const AnalyticsAcquisitionOptionsRead = {
  async dimension(
    transaction: Prisma.TransactionClient,
    query: AnalyticsQuery,
    versionIdentifiers: readonly string[],
    now: Date,
    dimension: keyof typeof Columns,
  ) {
    // Remove only this dimension's selection so changing it does not require clearing other filters.
    const cohort = AnalyticsQueries.cohort(omit(query, [dimension]), versionIdentifiers, now);
    const column = Columns[dimension];
    const rows = AnalyticsRows.validate(
      await transaction.$queryRaw<unknown[]>(
        Prisma.sql`${cohort} SELECT ${column} AS value, COUNT(*) AS sessions FROM cohort GROUP BY ${column} ORDER BY sessions DESC, value LIMIT ${AnalyticsPolicy.MaximumAcquisitionOptions + 1}`,
      ),
      Validators.option,
    );

    return {
      values: rows.slice(0, AnalyticsPolicy.MaximumAcquisitionOptions),
      hasMore: rows.length > AnalyticsPolicy.MaximumAcquisitionOptions,
    };
  },

  async read(
    transaction: Prisma.TransactionClient,
    query: AnalyticsQuery,
    versionIdentifiers: readonly string[],
    now: Date,
  ): Promise<AnalyticsAcquisitionOptions> {
    const sources = await AnalyticsAcquisitionOptionsRead.dimension(
      transaction,
      query,
      versionIdentifiers,
      now,
      'source',
    );
    const mediums = await AnalyticsAcquisitionOptionsRead.dimension(
      transaction,
      query,
      versionIdentifiers,
      now,
      'medium',
    );
    const campaigns = await AnalyticsAcquisitionOptionsRead.dimension(
      transaction,
      query,
      versionIdentifiers,
      now,
      'campaign',
    );

    return {
      sources: sources.values,
      mediums: mediums.values,
      campaigns: campaigns.values,
      sourcesHasMore: sources.hasMore,
      mediumsHasMore: mediums.hasMore,
      campaignsHasMore: campaigns.hasMore,
    };
  },
} as const;
