import type { AnalyticsResultBatch } from './analytics-result-batch.js';
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
  dimension(
    query: AnalyticsQuery,
    versionIdentifiers: readonly string[],
    now: Date,
    dimension: keyof typeof Columns,
  ) {
    // Remove only this dimension's selection so changing it does not require clearing other filters.
    const cohort = AnalyticsQueries.cohort(omit(query, [dimension]), versionIdentifiers, now);
    const column = Columns[dimension];

    return Prisma.sql`${cohort} SELECT ${column} AS value, COUNT(*) AS sessions FROM cohort GROUP BY ${column} ORDER BY sessions DESC, value LIMIT ${AnalyticsPolicy.MaximumAcquisitionOptions + 1}`;
  },

  projectDimension(rows: readonly unknown[]) {
    const options = AnalyticsRows.validate(rows, Validators.option);

    return {
      values: options.slice(0, AnalyticsPolicy.MaximumAcquisitionOptions),
      hasMore: options.length > AnalyticsPolicy.MaximumAcquisitionOptions,
    };
  },

  prepare(
    query: AnalyticsQuery,
    versionIdentifiers: readonly string[],
    now: Date,
  ): readonly Prisma.Sql[] {
    return [
      this.dimension(query, versionIdentifiers, now, 'source'),
      this.dimension(query, versionIdentifiers, now, 'medium'),
      this.dimension(query, versionIdentifiers, now, 'campaign'),
    ];
  },

  project(batch: AnalyticsResultBatch): AnalyticsAcquisitionOptions {
    const sources = this.projectDimension(batch.next());
    const mediums = this.projectDimension(batch.next());
    const campaigns = this.projectDimension(batch.next());

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
