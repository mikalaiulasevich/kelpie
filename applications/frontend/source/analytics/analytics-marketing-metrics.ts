import { AnalyticsFormatPolicy } from './analytics-policy';
import { AnalyticsContent } from './analytics-content';
import { Localization } from '../localization/localization';
import { Type, type Static } from 'typebox';
import { isNull } from 'es-toolkit/predicate';
import type { AnalyticsRatio, AnalyticsVersion } from '../management/management-types';
import { ManagementSchemas } from '../management/management-types';

export const AnalyticsRateMetric = {
  ResultCompletion: 'resultCompletion',
  CallToActionConversion: 'ctaConversion',
} as const;

export const AnalyticsRateMetricSchema = Type.Enum(AnalyticsRateMetric);

export type AnalyticsRateMetric = Static<typeof AnalyticsRateMetricSchema>;

export const AnalyticsSummaryMetric = {
  ...AnalyticsRateMetric,
  Started: 'started',
} as const;

export const AnalyticsSummaryMetricSchema = Type.Enum(AnalyticsSummaryMetric);

export type AnalyticsSummaryMetric = Static<typeof AnalyticsSummaryMetricSchema>;

export const MarketingMetricsSchema = Type.Object({
  started: Type.Number(),
  results: Type.Number(),
  clicks: Type.Number(),
  resultRate: ManagementSchemas.AnalyticsRatio,
  conversionRate: ManagementSchemas.AnalyticsRatio,
  clickThrough: ManagementSchemas.AnalyticsRatio,
  conversionDifference: Type.Union([Type.Number(), Type.Null()]),
});

type MarketingMetrics = Readonly<Static<typeof MarketingMetricsSchema>>;

type AnalyticsDifference = MarketingMetrics['conversionDifference'];

export const AnalyticsMarketingMetrics = {
  ratio(numerator: number, denominator: number): AnalyticsRatio {
    return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
  },

  summarize(version: AnalyticsVersion): MarketingMetrics {
    const started = version.variants.reduce((total, variant) => total + variant.started, 0);
    const results = version.variants.reduce(
      (total, variant) => total + variant.resultCompletion.numerator,
      0,
    );
    const clicks = version.variants.reduce(
      (total, variant) => total + variant.ctaConversion.numerator,
      0,
    );
    const resultClicks = version.variants.reduce(
      (total, variant) => total + variant.ctaClickThrough.numerator,
      0,
    );
    const resultViewers = version.variants.reduce(
      (total, variant) => total + variant.ctaClickThrough.denominator,
      0,
    );

    return {
      started,
      results,
      clicks,
      resultRate: this.ratio(results, started),
      conversionRate: this.ratio(clicks, started),
      clickThrough: this.ratio(resultClicks, resultViewers),
      conversionDifference: this.compare(version, AnalyticsRateMetric.CallToActionConversion),
    };
  },

  compare(version: AnalyticsVersion, metric: AnalyticsRateMetric): AnalyticsDifference {
    const controlRate =
      version.variants.find((variant) => variant.variant === 'A')?.[metric].value ?? null;
    const treatmentRate =
      version.variants.find((variant) => variant.variant === 'B')?.[metric].value ?? null;

    return isNull(controlRate) || isNull(treatmentRate)
      ? null
      : (treatmentRate - controlRate) * 100;
  },

  ribbon(counts: readonly number[], maximum: number, scale: number): string {
    if (maximum === 0 || counts.length !== 3) {
      return '';
    }

    const radii = counts.map((count) => (count / maximum) * 72 * scale);
    const [start = 0, middle = 0, end = 0] = radii;

    return `M 0 ${90 - start} L 48 ${90 - start} C 154 ${90 - start}, 166 ${90 - middle}, 280 ${90 - middle} L 320 ${90 - middle} C 434 ${90 - middle}, 446 ${90 - end}, 552 ${90 - end} L 600 ${90 - end} L 600 ${90 + end} L 552 ${90 + end} C 446 ${90 + end}, 434 ${90 + middle}, 320 ${90 + middle} L 280 ${90 + middle} C 166 ${90 + middle}, 154 ${90 + start}, 48 ${90 + start} L 0 ${90 + start} Z`;
  },

  differenceColor(value: AnalyticsDifference): string {
    if (isNull(value) || value === 0) {
      return 'var(--muted-foreground)';
    }

    return value < 0 ? 'var(--destructive)' : 'var(--success)';
  },

  difference(value: AnalyticsDifference): string {
    if (isNull(value)) {
      return Localization.translate(AnalyticsContent.NotAvailable);
    }

    const formatted = new Intl.NumberFormat(Localization.formattingLocale, {
      maximumFractionDigits: AnalyticsFormatPolicy.MaximumFractionDigits,
      signDisplay: 'exceptZero',
    }).format(value);

    return `${formatted} PP`;
  },
} as const;
