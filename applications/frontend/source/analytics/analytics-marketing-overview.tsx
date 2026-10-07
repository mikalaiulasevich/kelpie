import { useLocalization } from '../localization/use-localization';
import { isNull } from 'es-toolkit/predicate';
import {
  ArrowRight,
  ChartNoAxesCombined,
  MousePointer2,
  Users,
  CircleCheck,
  FlaskConical,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Progress } from '../components/progress';
import { Badge } from '../components/badge';
import type {
  AnalyticsRatio,
  AnalyticsVariant,
  AnalyticsVersion,
} from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';
import { AnalyticsMarketingMetrics } from './analytics-marketing-metrics';

function MarketingRibbon({
  variant,
  maximum,
}: {
  readonly variant: AnalyticsVariant;
  readonly maximum: number;
}) {
  const { t } = useLocalization();

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
          {t('Variant')} {variant.variant}
        </span>
        <span className="text-xs text-muted-foreground">
          {AnalyticsFormat.ratio(variant.ctaClickThrough)} {t('result → CTA')}
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
          {t('No started sessions for this variant.')}
        </p>
      )}
    </div>
  );
}

interface VariantMetricDetailsProperties {
  version: AnalyticsVersion;
  metric: 'started' | 'resultCompletion' | 'ctaConversion';
}

function MetricPercentage({ ratio }: { readonly ratio: AnalyticsRatio }): UIElement {
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

function MetricComparison({
  version,
  metric,
}: {
  readonly version: AnalyticsVersion;
  readonly metric: 'resultCompletion' | 'ctaConversion';
}): UIElement {
  const { t } = useLocalization();

  const rateA = version.variants.find((variant) => variant.variant === 'A')?.[metric].value ?? null;
  const rateB = version.variants.find((variant) => variant.variant === 'B')?.[metric].value ?? null;
  const difference = isNull(rateA) || isNull(rateB) ? null : (rateB - rateA) * 100;

  return (
    <p className="metric-comparison-note">
      {isNull(difference) ? (
        'A/B comparison needs sessions in both variants.'
      ) : (
        <>
          {t('B vs A')} {t(' ')}
          <strong style={{ color: AnalyticsMarketingMetrics.differenceColor(difference) }}>
            {AnalyticsMarketingMetrics.difference(difference)}
          </strong>
          <span>{t('Percentage points · significance not tested')}</span>
        </>
      )}
    </p>
  );
}

function VariantMetricDetails({ version, metric }: VariantMetricDetailsProperties) {
  const { t } = useLocalization();

  const totalStarted = version.variants.reduce((total, variant) => total + variant.started, 0);

  return (
    <dl className="metric-variant-details">
      {version.variants.map((variant) => {
        const value = variant[metric];

        return (
          <div key={variant.variant}>
            <dt>
              {t('Variant')} {variant.variant}
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
                  {t('of starts')}
                </dd>
                <Progress
                  className="mt-2 h-1"
                  value={100 * (AnalyticsMarketingMetrics.ratio(value, totalStarted).value ?? 0)}
                  aria-label={t('Variant {variant}: share of starts', { variant: variant.variant })}
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
                    aria-label={t('Variant {variant}: {metric}', {
                      variant: variant.variant,
                      metric: t(
                        metric === 'resultCompletion' ? 'Result completion' : 'CTA conversion',
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

export function AnalyticsMarketingOverview({ version }: { readonly version: AnalyticsVersion }) {
  const { t } = useLocalization();

  const metrics = AnalyticsMarketingMetrics.summarize(version);
  const maximum = Math.max(...version.variants.map((variant) => variant.started), 0);

  return (
    <section
      className="@container/marketing grid min-w-0 gap-5"
      aria-label={t('Marketing performance overview')}
    >
      <div className="grid min-w-0 gap-3 @min-[36rem]/marketing:grid-cols-3">
        <Card className="metric-summary compact-card min-w-0 gap-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <span className="metric-summary-icon">
                <Users className="size-4" strokeWidth={1.5} />
              </span>
              {t('Started sessions')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="metric-summary-value">{AnalyticsFormat.count(metrics.started)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('Version')} {version.funnelVersion} {t('· Across selected variants')}
            </p>
            <VariantMetricDetails version={version} metric="started" />
            <p className="metric-comparison-note">
              {t('Observed session split')}
              <span>{t('Counts follow the current traffic and campaign filters.')}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="metric-summary compact-card min-w-0 gap-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <span className="metric-summary-icon">
                <CircleCheck className="size-4" strokeWidth={1.5} />
              </span>
              {t('Result completion')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricPercentage ratio={metrics.resultRate} />
            <p className="mt-2 text-xs text-muted-foreground">
              {AnalyticsFormat.count(metrics.results)} {t('of')}{' '}
              {AnalyticsFormat.count(metrics.started)} {t(' ')} {t('starts viewed a result')}
            </p>
            <VariantMetricDetails version={version} metric="resultCompletion" />
            <MetricComparison version={version} metric="resultCompletion" />
          </CardContent>
        </Card>
        <Card className="metric-summary compact-card min-w-0 gap-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <span className="metric-summary-icon">
                <MousePointer2 className="size-4" strokeWidth={1.5} />
              </span>
              {t('CTA conversion')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetricPercentage ratio={metrics.conversionRate} />
            <p className="mt-2 text-xs text-muted-foreground">
              {AnalyticsFormat.count(metrics.clicks)} {t('of')}{' '}
              {AnalyticsFormat.count(metrics.started)} {t(' ')} {t('starts clicked a CTA')}
            </p>
            <VariantMetricDetails version={version} metric="ctaConversion" />
            <MetricComparison version={version} metric="ctaConversion" />
          </CardContent>
        </Card>
      </div>
      <div className="grid min-w-0 gap-5 @min-[62rem]/marketing:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <ChartNoAxesCombined className="size-4 text-primary" />
                {t('Session milestones')}
              </CardTitle>
              <Badge variant="outline">
                {t('Version')} {version.funnelVersion}
              </Badge>
            </div>
            <CardDescription>
              {t('Ribbon width shows session count on a shared scale.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 px-3 text-center text-[11px] text-muted-foreground sm:text-xs">
              <span>{t('Started')}</span>
              <span>{t('Result viewed')}</span>
              <span>{t('Result viewers who clicked')}</span>
            </div>
            {metrics.started > 0 ? (
              version.variants.map((variant) => (
                <MarketingRibbon key={variant.variant} variant={variant} maximum={maximum} />
              ))
            ) : (
              <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-muted/30 px-5 py-6 text-center">
                <ChartNoAxesCombined className="size-7 text-muted-foreground" />
                <p className="text-sm font-medium">{t('Your funnel will appear here')}</p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {t(
                    'No started sessions match the current filters. Milestones appear when traffic reaches this version.',
                  )}
                </p>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('Milestones across all branches. Sessions without a result may still be open.')}
            </p>
            <table className="sr-only">
              <caption>{t('Session milestone counts by variant')}</caption>
              <thead>
                <tr>
                  <th>{t('Variant')}</th>
                  <th>{t('Started')}</th>
                  <th>{t('Result viewed')}</th>
                  <th>{t('Result viewers who clicked')}</th>
                </tr>
              </thead>
              <tbody>
                {version.variants.map((variant) => (
                  <tr key={variant.variant}>
                    <th>{variant.variant}</th>
                    <td>{variant.started}</td>
                    <td>{variant.resultCompletion.numerator}</td>
                    <td>{variant.ctaClickThrough.numerator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" />
              {t('Variant comparison')}
            </CardTitle>
            <CardDescription>{t('CTA conversion · B minus A')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div
              className="analytics-difference-panel rounded-lg px-4 py-4"
              data-comparable={!isNull(metrics.conversionDifference)}
              style={{
                color: AnalyticsMarketingMetrics.differenceColor(metrics.conversionDifference),
              }}
            >
              {isNull(metrics.conversionDifference) ? (
                <>
                  <p className="text-sm font-medium">{t('No comparison yet')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t('Both variants need sessions to compare CTA conversion.')}
                  </p>
                </>
              ) : (
                <>
                  <p
                    className="text-xl font-medium tracking-tight tabular-nums"
                    style={{
                      color: AnalyticsMarketingMetrics.differenceColor(
                        metrics.conversionDifference,
                      ),
                    }}
                  >
                    {AnalyticsMarketingMetrics.difference(metrics.conversionDifference)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t('Percentage-point difference. Statistical significance is not tested.')}
                  </p>
                </>
              )}
            </div>
            <div className="grid gap-4">
              {version.variants.map((variant) => (
                <div key={variant.variant} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {t('Variant')} {variant.variant}
                    </span>
                    <span className="font-medium tabular-nums">
                      {AnalyticsFormat.ratio(variant.ctaConversion)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${variant.variant === 'A' ? 'bg-primary' : 'bg-violet'}`}
                      style={{ width: `${(variant.ctaConversion.value ?? 0) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {AnalyticsFormat.fraction(variant.ctaConversion)}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{t('Result → CTA')}</span>
                <ArrowRight className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isNull(metrics.clickThrough.value)
                  ? t('—')
                  : AnalyticsFormat.ratio(metrics.clickThrough)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t('CTA clicks / result views, across selected variants.')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
