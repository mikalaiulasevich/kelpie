import {
  ExperimentVariant,
  StepType,
  type FunnelConfiguration,
  type FunnelStep,
} from '@kelpie/contracts';
import { groupBy } from 'es-toolkit/array';
import type { FunnelVersion } from '../../generated/prisma/client.js';
import { ConfigurationImportDocument } from '../configurations/configuration-import-document.js';
import { AnalyticsMessages } from './analytics-messages.js';
import { AnalyticsResults } from './analytics-results.js';
import type {
  AnalyticsEdgeRow,
  AnalyticsStepRow,
  AnalyticsAggregates,
  AnalyticsAggregateGroups,
  AnalyticsQuery,
  AnalyticsGroup,
} from './analytics-types.js';
import type {
  AnalyticsStep,
  AnalyticsEdge,
  AnalyticsVariant,
  AnalyticsVersion,
  AnalyticsMetadata,
} from './analytics-response.js';

export const AnalyticsProjection = {
  metadata(query: AnalyticsQuery, pageLength: number, now: Date): AnalyticsMetadata {
    return {
      generatedAt: now.toISOString(),
      filters: query,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: pageLength > query.limit,
      },
    };
  },

  groupKey({ versionIdentifier, variant }: AnalyticsGroup): string {
    return `${versionIdentifier}/${variant}`;
  },

  group(aggregates: AnalyticsAggregates): AnalyticsAggregateGroups {
    return {
      summaries: groupBy(aggregates.summaries, AnalyticsProjection.groupKey),
      steps: groupBy(aggregates.steps, AnalyticsProjection.groupKey),
      edges: groupBy(aggregates.edges, AnalyticsProjection.groupKey),
    };
  },

  step(step: FunnelStep, row: Optional<AnalyticsStepRow>): AnalyticsStep {
    const stepMetrics = {
      stepIdentifier: step.id,
      conditional: Boolean(step.visibleWhen),
      reached: row?.reached ?? 0,
    };

    if (step.type === StepType.Result) {
      return { ...stepMetrics, type: StepType.Result };
    }

    return {
      ...stepMetrics,
      type: step.type,
      completed: row?.completed ?? 0,
      completion: AnalyticsResults.ratio(row?.observedCompleted ?? 0, stepMetrics.reached),
      noncompletion: { open: row?.openNoncompletion ?? 0, expired: row?.expiredNoncompletion ?? 0 },
      expiredDropout: AnalyticsResults.ratio(
        row?.expiredNoncompletion ?? 0,
        row?.expiredReached ?? 0,
      ),
    };
  },

  edge(row: AnalyticsEdgeRow): AnalyticsEdge {
    return {
      fromStepIdentifier: row.fromStepIdentifier,
      toStepIdentifier: row.toStepIdentifier,
      transitions: row.transitions,
      observedConversion: AnalyticsResults.ratio(row.observed, row.sourceReached),
      branchShare: AnalyticsResults.ratio(row.transitions, row.sourceCompleted),
      transitionToView: AnalyticsResults.ratio(row.destinationReached, row.transitions),
      destinationNonreach: { open: row.openNonreach, expired: row.expiredNonreach },
    };
  },

  variant(
    versionIdentifier: string,
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    aggregates: AnalyticsAggregateGroups,
  ): AnalyticsVariant {
    const groupKey = AnalyticsProjection.groupKey({ versionIdentifier, variant });
    const summary = aggregates.summaries[groupKey]?.[0];
    const metricsByStepIdentifier = new Map(
      (aggregates.steps[groupKey] ?? []).map((row) => [row.stepIdentifier, row]),
    );
    const edges = aggregates.edges[groupKey] ?? [];
    const started = summary?.started ?? 0;

    return {
      variant,
      started,
      resultCompletion: AnalyticsResults.ratio(summary?.results ?? 0, started),
      ctaConversion: AnalyticsResults.ratio(summary?.clicks ?? 0, started),
      ctaClickThrough: AnalyticsResults.ratio(summary?.resultClicks ?? 0, summary?.results ?? 0),
      steps: configuration.experiment.variants[variant].stepSequence.map((stepIdentifier) => {
        const step = configuration.steps[stepIdentifier];

        if (!step) {
          throw new Error(AnalyticsMessages.InvalidConfiguration);
        }

        return AnalyticsProjection.step(step, metricsByStepIdentifier.get(stepIdentifier));
      }),
      edges: edges.map(AnalyticsProjection.edge),
    };
  },

  version(record: FunnelVersion, aggregates: AnalyticsAggregateGroups): AnalyticsVersion {
    const prepared = ConfigurationImportDocument.prepare(record.document);

    if (!ConfigurationImportDocument.matchesVersion(record, prepared)) {
      throw new Error(AnalyticsMessages.InvalidConfiguration);
    }

    return {
      versionIdentifier: record.identifier,
      funnelVersion: record.version,
      experimentIdentifier: prepared.configuration.experiment.id,
      variants: Object.values(ExperimentVariant).map((variant) =>
        AnalyticsProjection.variant(record.identifier, prepared.configuration, variant, aggregates),
      ),
    };
  },
} as const;
