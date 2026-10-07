import { ExperimentVariant, StepType, type FunnelConfiguration, type FunnelStep } from '@kelpie/contracts';
import type { FunnelVersion } from '../../generated/prisma/client.js';
import { ConfigurationImportDocument } from '../configurations/configuration-import-document.js';
import { AnalyticsMessages } from './analytics-messages.js';
import { AnalyticsResults } from './analytics-results.js';
import type { AnalyticsEdgeRow, AnalyticsStepRow, AnalyticsAggregates } from './analytics-types.js';
import type { AnalyticsStep, AnalyticsEdge, AnalyticsVariant, AnalyticsVersion } from './analytics-response.js';

export const AnalyticsProjection = {
  step(step: FunnelStep, row: Optional<AnalyticsStepRow>): AnalyticsStep {
    const base = { stepIdentifier: step.id, type: step.type, conditional: Boolean(step.visibleWhen), reached: row?.reached ?? 0 };
    if (step.type === StepType.Result) {
      return base;
    }

    return { ...base, completed: row?.completed ?? 0, completion: AnalyticsResults.ratio(row?.observedCompleted ?? 0, base.reached), noncompletion: { open: row?.openNoncompletion ?? 0, expired: row?.expiredNoncompletion ?? 0 }, expiredDropout: AnalyticsResults.ratio(row?.expiredNoncompletion ?? 0, row?.expiredReached ?? 0) };
  },

  edge(row: AnalyticsEdgeRow): AnalyticsEdge {
    return { fromStepIdentifier: row.fromStepIdentifier, toStepIdentifier: row.toStepIdentifier, transitions: row.transitions, observedConversion: AnalyticsResults.ratio(row.observed, row.sourceReached), branchShare: AnalyticsResults.ratio(row.transitions, row.sourceCompleted), transitionToView: AnalyticsResults.ratio(row.destinationReached, row.transitions), destinationNonreach: { open: row.openNonreach, expired: row.expiredNonreach } };
  },

  variant(versionIdentifier: string, configuration: FunnelConfiguration, variant: ExperimentVariant, aggregates: AnalyticsAggregates): AnalyticsVariant {
    const summary = aggregates.summaries.find((row) => row.versionIdentifier === versionIdentifier && row.variant === variant);
    const steps = new Map(aggregates.steps.filter((row) => row.versionIdentifier === versionIdentifier && row.variant === variant).map((row) => [row.stepIdentifier, row]));
    const edges = aggregates.edges.filter((row) => row.versionIdentifier === versionIdentifier && row.variant === variant);
    const started = summary?.started ?? 0;

    return {
      variant, started,
      resultCompletion: AnalyticsResults.ratio(summary?.results ?? 0, started),
      ctaConversion: AnalyticsResults.ratio(summary?.clicks ?? 0, started),
      ctaClickThrough: AnalyticsResults.ratio(summary?.resultClicks ?? 0, summary?.results ?? 0),
      steps: configuration.experiment.variants[variant].stepSequence.map((identifier) => {
        const step = configuration.steps[identifier];
        if (!step) {
          throw new Error(AnalyticsMessages.InvalidConfiguration);
        }

        return AnalyticsProjection.step(step, steps.get(identifier));
      }),
      edges: edges.map(AnalyticsProjection.edge),
    };
  },

  version(record: FunnelVersion, aggregates: AnalyticsAggregates): AnalyticsVersion {
    const prepared = ConfigurationImportDocument.prepare(record.document);
    if (!ConfigurationImportDocument.matchesVersion(record, prepared)) {
      throw new Error(AnalyticsMessages.InvalidConfiguration);
    }

    return { versionIdentifier: record.identifier, funnelVersion: record.version, experimentIdentifier: prepared.configuration.experiment.id, variants: Object.values(ExperimentVariant).map((variant) => AnalyticsProjection.variant(record.identifier, prepared.configuration, variant, aggregates)) };
  },
} as const;
