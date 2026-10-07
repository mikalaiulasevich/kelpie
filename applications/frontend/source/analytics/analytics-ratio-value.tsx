import { useLocalization } from '../localization/use-localization';
import type { AnalyticsRatio } from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';

interface AnalyticsRatioValueProperties {
  readonly ratio: AnalyticsRatio;
  readonly tone?: 'neutral' | 'positive' | 'negative';
}

export function AnalyticsRatioValue({ ratio, tone = 'neutral' }: AnalyticsRatioValueProperties) {
  useLocalization();

  return (
    <div className="flex flex-col gap-1">
      <span
        data-tone={ratio.numerator > 0 ? tone : 'neutral'}
        className="font-semibold tabular-nums data-[tone=positive]:text-success data-[tone=negative]:text-destructive"
      >
        {AnalyticsFormat.ratio(ratio)}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {AnalyticsFormat.fraction(ratio)}
      </span>
    </div>
  );
}
