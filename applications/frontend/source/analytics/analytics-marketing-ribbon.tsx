import { AnalyticsContent } from './analytics-content';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsFormat } from './analytics-format';
import { AnalyticsMarketingMetrics } from './analytics-marketing-metrics';
import type { AnalyticsVariant } from '../management/management-types';

interface MarketingRibbonProperties {
  readonly variant: AnalyticsVariant;
  readonly maximum: number;
}

export function AnalyticsMarketingRibbon({ variant, maximum }: MarketingRibbonProperties) {
  const { t: translate } = useLocalization();

  const counts = [
    variant.started,
    variant.resultCompletion.numerator,
    variant.ctaClickThrough.numerator,
  ];
  const tone = variant.variant === 'A' ? 'text-primary' : 'text-violet';

  return (
    <div className="min-w-0 rounded-2xl bg-background/25 px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`flex items-center gap-2 text-sm font-medium ${tone}`}>
          <span className="size-2 rounded-full bg-current" />
          {translate(AnalyticsContent.Variant)} {variant.variant}
        </span>
        <span className="text-xs text-muted-foreground">
          {AnalyticsFormat.ratio(variant.ctaClickThrough)}{' '}
          {translate(AnalyticsContent.ResultToActionUnit)}
        </span>
      </div>
      <div className={`relative mt-4 ${tone}`}>
        <svg
          viewBox="0 0 600 180"
          preserveAspectRatio="none"
          className="h-32 w-full sm:h-40"
          aria-hidden="true"
        >
          <path
            d={AnalyticsMarketingMetrics.ribbon(counts, maximum, 1)}
            fill="currentColor"
            opacity="0.16"
          />
          <path
            d={AnalyticsMarketingMetrics.ribbon(counts, maximum, 0.72)}
            fill="currentColor"
            opacity="0.28"
          />
          <path
            d={AnalyticsMarketingMetrics.ribbon(counts, maximum, 0.42)}
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M48 0V180 M300 0V180 M552 0V180"
            stroke="currentColor"
            strokeOpacity="0.24"
            strokeDasharray="3 5"
          />
        </svg>
        <div className="absolute inset-x-0 top-1/2 grid -translate-y-1/2 grid-cols-3 gap-1 text-center">
          {counts.map((count, index) => (
            <span
              key={index}
              className="mx-auto max-w-full rounded-xl bg-background/95 px-2 py-1 font-mono text-xs text-foreground tabular-nums sm:px-3"
            >
              {AnalyticsFormat.count(count)}
            </span>
          ))}
        </div>
      </div>
      {variant.started === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {translate(AnalyticsContent.EmptyVariant)}
        </p>
      )}
    </div>
  );
}
