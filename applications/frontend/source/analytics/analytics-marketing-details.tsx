import { AnalyticsContent } from './analytics-content';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsFormat } from './analytics-format';
import { isNull } from 'es-toolkit/predicate';
import { Progress } from '../components/progress';
import type { AnalyticsRatio, AnalyticsVersion } from '../management/management-types';
import {
  AnalyticsMarketingMetrics,
  AnalyticsRateMetric,
  type AnalyticsSummaryMetric,
} from './analytics-marketing-metrics';

interface VariantMetricDetailsProperties {
  readonly version: AnalyticsVersion;
  readonly metric: AnalyticsSummaryMetric;
}

interface MetricPercentageProperties {
  readonly ratio: AnalyticsRatio;
}

export function AnalyticsMetricPercentage({ ratio }: MetricPercentageProperties): UIElement {
  useLocalization();

  return (
    <p className="metric-summary-value" aria-label={AnalyticsFormat.ratio(ratio)}>
      {isNull(ratio.value) ? (
        '—'
      ) : (
        <>
          <span>{AnalyticsFormat.ratio(ratio).replace('%', '')}</span>
          <span className="metric-percent-sign">%</span>
        </>
      )}
    </p>
  );
}

interface MetricComparisonProperties {
  readonly version: AnalyticsVersion;
  readonly metric: AnalyticsRateMetric;
}

export function AnalyticsMetricComparison({
  version,
  metric,
}: MetricComparisonProperties): UIElement {
  const { t: translate } = useLocalization();

  const difference = AnalyticsMarketingMetrics.compare(version, metric);

  return (
    <p className="metric-comparison-note">
      {isNull(difference) ? (
        AnalyticsContent.ComparisonNeedsSessions
      ) : (
        <>
          {translate(AnalyticsContent.ComparisonDirection)}{' '}
          <strong style={{ color: AnalyticsMarketingMetrics.differenceColor(difference) }}>
            {AnalyticsMarketingMetrics.difference(difference)}
          </strong>
          <span>{translate(AnalyticsContent.ComparisonSignificance)}</span>
        </>
      )}
    </p>
  );
}

export function AnalyticsVariantMetricDetails({ version, metric }: VariantMetricDetailsProperties) {
  const { t: translate } = useLocalization();

  const totalStarted = version.variants.reduce((total, variant) => total + variant.started, 0);

  return (
    <dl className="metric-variant-details">
      {version.variants.map((variant) => {
        const value = variant[metric];

        return (
          <div key={variant.variant}>
            <dt>
              {translate(AnalyticsContent.Variant)} {variant.variant}
            </dt>
            <dd>
              {typeof value === 'number'
                ? AnalyticsFormat.count(value)
                : AnalyticsFormat.ratio(value)}
            </dd>
            {typeof value === 'number' && (
              <>
                <dd className="metric-variant-count">
                  {AnalyticsFormat.ratio(AnalyticsMarketingMetrics.ratio(value, totalStarted))}{' '}
                  {translate(AnalyticsContent.StartsShare)}
                </dd>
                <Progress
                  className="mt-2 h-1"
                  value={100 * (AnalyticsMarketingMetrics.ratio(value, totalStarted).value ?? 0)}
                  aria-label={translate(AnalyticsContent.VariantShareLabel, {
                    variant: variant.variant,
                  })}
                />
              </>
            )}
            {typeof value !== 'number' && (
              <>
                <dd className="metric-variant-count">{AnalyticsFormat.fraction(value)}</dd>
                {!isNull(value.value) && (
                  <Progress
                    className="mt-2 h-1"
                    value={Math.min(100, value.value * 100)}
                    aria-label={translate(AnalyticsContent.VariantMetricLabel, {
                      variant: variant.variant,
                      metric: translate(
                        metric === AnalyticsRateMetric.ResultCompletion
                          ? AnalyticsContent.ResultCompletion
                          : AnalyticsContent.CallToActionConversion,
                      ),
                    })}
                  />
                )}
              </>
            )}
          </div>
        );
      })}
    </dl>
  );
}
