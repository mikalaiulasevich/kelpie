import { isNull } from 'es-toolkit/predicate';
import type { AnalyticsRatio } from '../management/management-types';

const countFormatter = new Intl.NumberFormat('en-US');

const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export const AnalyticsFormat = {
  count(value: number): string {
    return countFormatter.format(value);
  },

  ratio(ratio: AnalyticsRatio): string {
    return isNull(ratio.value) ? 'Not applicable' : percentageFormatter.format(ratio.value);
  },

  fraction(ratio: AnalyticsRatio): string {
    return `${countFormatter.format(ratio.numerator)} / ${countFormatter.format(ratio.denominator)} sessions`;
  },

  generatedAt(value: string): string {
    return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  },
} as const;
