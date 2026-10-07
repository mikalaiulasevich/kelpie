import type { ValidateFunction } from 'ajv';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { isPlainObject } from 'es-toolkit/predicate';
import { AnalyticsMessages } from './analytics-messages.js';
import {
  AnalyticsSchemas,
  type AnalyticsSummaryRow,
  type AnalyticsStepRow,
  type AnalyticsEdgeRow,
  type AnalyticsRatio,
} from './analytics-types.js';

const AnalyticsValidators = {
  summary: SchemaCompiler.compile<AnalyticsSummaryRow>(AnalyticsSchemas.SummaryRow),
  step: SchemaCompiler.compile<AnalyticsStepRow>(AnalyticsSchemas.StepRow),
  edge: SchemaCompiler.compile<AnalyticsEdgeRow>(AnalyticsSchemas.EdgeRow),
} as const;

export const AnalyticsRows = {
  normalize(value: unknown): object {
    if (!isPlainObject(value)) {
      throw new Error(AnalyticsMessages.InvalidAggregate);
    }

    return Object.fromEntries(
      Object.entries(value).map(([propertyName, propertyValue]) => [
        propertyName,
        typeof propertyValue === 'bigint' ? Number(propertyValue) : propertyValue,
      ]),
    );
  },

  validate<Row>(rows: readonly unknown[], validate: ValidateFunction<Row>): readonly Row[] {
    return rows.map((row) => {
      const normalizedRow = AnalyticsRows.normalize(row);

      if (!validate(normalizedRow)) {
        throw new Error(AnalyticsMessages.InvalidAggregate);
      }

      return normalizedRow;
    });
  },
} as const;

export const AnalyticsResults = {
  summaries(rows: readonly unknown[]): readonly AnalyticsSummaryRow[] {
    return AnalyticsRows.validate(rows, AnalyticsValidators.summary);
  },

  steps(rows: readonly unknown[]): readonly AnalyticsStepRow[] {
    return AnalyticsRows.validate(rows, AnalyticsValidators.step);
  },

  edges(rows: readonly unknown[]): readonly AnalyticsEdgeRow[] {
    return AnalyticsRows.validate(rows, AnalyticsValidators.edge);
  },

  ratio(numerator: number, denominator: number): AnalyticsRatio {
    return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
  },
} as const;
