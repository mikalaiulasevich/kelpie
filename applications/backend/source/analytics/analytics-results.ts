import { Ajv, type ValidateFunction } from 'ajv';
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
const AnalyticsValidators = {
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

  rows<Row>(rows: readonly unknown[], validate: ValidateFunction<Row>): readonly Row[] {
    return rows.map((row) => {
      const value = AnalyticsResults.normalize(row);
      if (!validate(value)) {
        throw new Error(AnalyticsMessages.InvalidAggregate);
      }

      return value;
    });
  },

  summaries(rows: readonly unknown[]): readonly AnalyticsSummaryRow[] {
    return AnalyticsResults.rows(rows, AnalyticsValidators.summary);
  },

  steps(rows: readonly unknown[]): readonly AnalyticsStepRow[] {
    return AnalyticsResults.rows(rows, AnalyticsValidators.step);
  },

  edges(rows: readonly unknown[]): readonly AnalyticsEdgeRow[] {
    return AnalyticsResults.rows(rows, AnalyticsValidators.edge);
  },

  ratio(numerator: number, denominator: number): AnalyticsRatio {
    return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
  },
} as const;
