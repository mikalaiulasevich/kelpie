import { Ajv } from 'ajv';
import { isPlainObject } from 'es-toolkit/predicate';
import { AnalyticsMessages } from './analytics-messages.js';
import {
  AnalyticsSchemas,
  type AnalyticsSummaryRow,
  type AnalyticsStepRow,
  type AnalyticsEdgeRow,
  type AnalyticsRatio,
} from './analytics-types.js';

const compiler = new Ajv({
  strict: true,
  allErrors: false,
  coerceTypes: false,
  ownProperties: true,
});
const validators = {
  summary: compiler.compile<AnalyticsSummaryRow>(AnalyticsSchemas.SummaryRow),
  step: compiler.compile<AnalyticsStepRow>(AnalyticsSchemas.StepRow),
  edge: compiler.compile<AnalyticsEdgeRow>(AnalyticsSchemas.EdgeRow),
} as const;

export const AnalyticsResults = {
  normalize(value: unknown): object {
    if (!isPlainObject(value)) {
      throw new Error(AnalyticsMessages.InvalidAggregate);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        typeof child === 'bigint' ? Number(child) : child,
      ]),
    );
  },

  summaries(rows: readonly unknown[]): readonly AnalyticsSummaryRow[] {
    return rows.map((row) => {
      const value = AnalyticsResults.normalize(row);
      if (!validators.summary(value)) {
        throw new Error(AnalyticsMessages.InvalidAggregate);
      }

      return value;
    });
  },

  steps(rows: readonly unknown[]): readonly AnalyticsStepRow[] {
    return rows.map((row) => {
      const value = AnalyticsResults.normalize(row);
      if (!validators.step(value)) {
        throw new Error(AnalyticsMessages.InvalidAggregate);
      }

      return value;
    });
  },

  edges(rows: readonly unknown[]): readonly AnalyticsEdgeRow[] {
    return rows.map((row) => {
      const value = AnalyticsResults.normalize(row);
      if (!validators.edge(value)) {
        throw new Error(AnalyticsMessages.InvalidAggregate);
      }

      return value;
    });
  },

  ratio(numerator: number, denominator: number): AnalyticsRatio {
    return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
  },
} as const;
