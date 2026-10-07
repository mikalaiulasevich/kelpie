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
      maximumFractionDigits: 1,
    }).format(value);
  },

  ratio(ratio: AnalyticsRatio): string {
    return isNull(ratio.value)
      ? Localization.translate('Not applicable')
      : new Intl.NumberFormat(Localization.formattingLocale, {
          style: 'percent',
          maximumFractionDigits: 1,
        }).format(ratio.value);
  },

  fraction(ratio: AnalyticsRatio): string {
    return `${new Intl.NumberFormat(Localization.formattingLocale).format(ratio.numerator)} / ${new Intl.NumberFormat(Localization.formattingLocale).format(ratio.denominator)} ${Localization.translate('sessions')}`;
  },

  generatedAt(value: string): string {
    return new Date(value).toLocaleString(Localization.formattingLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  },
} as const;
