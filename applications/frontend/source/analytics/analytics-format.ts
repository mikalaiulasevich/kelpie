import { AnalyticsFormatPolicy } from './analytics-policy';
import { AnalyticsContent } from './analytics-content';
import { Localization } from '../localization/localization';
import { isNull } from 'es-toolkit/predicate';
import type { AnalyticsRatio } from '../management/management-types';

export const AnalyticsFormat = {
  count(value: number): string {
    return new Intl.NumberFormat(Localization.formattingLocale).format(value);
  },

  percentage(value: number): string {
    return new Intl.NumberFormat(Localization.formattingLocale, {
      style: 'percent',
      maximumFractionDigits: AnalyticsFormatPolicy.MaximumFractionDigits,
    }).format(value);
  },

  ratio(ratio: AnalyticsRatio): string {
    return isNull(ratio.value)
      ? Localization.translate(AnalyticsContent.NotApplicable)
      : this.percentage(ratio.value);
  },

  fraction(ratio: AnalyticsRatio): string {
    return `${this.count(ratio.numerator)} / ${this.count(ratio.denominator)} ${Localization.translate(AnalyticsContent.SessionsUnit)}`;
  },

  generatedAt(value: string): string {
    return new Date(value).toLocaleString(Localization.formattingLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  },
} as const;
