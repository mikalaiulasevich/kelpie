import { AnalyticsMarketingRibbon } from './analytics-marketing-ribbon';
import {
  AnalyticsMetricPercentage,
  AnalyticsMetricComparison,
  AnalyticsVariantMetricDetails,
} from './analytics-marketing-details';
import { AnalyticsContent } from './analytics-content';
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
import { Badge } from '../components/badge';
import type { AnalyticsVersion } from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';
import { AnalyticsMarketingMetrics, AnalyticsSummaryMetric } from './analytics-marketing-metrics';

interface AnalyticsMarketingOverviewProperties {
  readonly version: AnalyticsVersion;
}

export function AnalyticsMarketingOverview({ version }: AnalyticsMarketingOverviewProperties) {
  const { t: translate } = useLocalization();

  const metrics = AnalyticsMarketingMetrics.summarize(version);
  const maximum = Math.max(...version.variants.map((variant) => variant.started), 0);

  return (
    <section
      className="@container/marketing grid min-w-0 gap-5"
      aria-label={translate(AnalyticsContent.MarketingOverview)}
    >
      <div className="grid min-w-0 gap-3 @min-[36rem]/marketing:grid-cols-3">
        <Card className="metric-summary compact-card min-w-0 gap-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <span className="metric-summary-icon">
                <Users className="size-4" strokeWidth={1.5} />
              </span>
              {translate(AnalyticsContent.StartedSessions)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="metric-summary-value">{AnalyticsFormat.count(metrics.started)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {translate(AnalyticsContent.Version)} {version.funnelVersion}{' '}
              {translate(AnalyticsContent.AcrossVariants)}
            </p>
            <AnalyticsVariantMetricDetails
              version={version}
              metric={AnalyticsSummaryMetric.Started}
            />
            <p className="metric-comparison-note">
              {translate(AnalyticsContent.ObservedSplit)}
              <span>{translate(AnalyticsContent.FilterCounts)}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="metric-summary compact-card min-w-0 gap-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <span className="metric-summary-icon">
                <CircleCheck className="size-4" strokeWidth={1.5} />
              </span>
              {translate(AnalyticsContent.ResultCompletion)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsMetricPercentage ratio={metrics.resultRate} />
            <p className="mt-2 text-xs text-muted-foreground">
              {AnalyticsFormat.count(metrics.results)} {translate(AnalyticsContent.Of)}{' '}
              {AnalyticsFormat.count(metrics.started)}{' '}
              {translate(AnalyticsContent.StartsViewedResult)}
            </p>
            <AnalyticsVariantMetricDetails
              version={version}
              metric={AnalyticsSummaryMetric.ResultCompletion}
            />
            <AnalyticsMetricComparison
              version={version}
              metric={AnalyticsSummaryMetric.ResultCompletion}
            />
          </CardContent>
        </Card>
        <Card className="metric-summary compact-card min-w-0 gap-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <span className="metric-summary-icon">
                <MousePointer2 className="size-4" strokeWidth={1.5} />
              </span>
              {translate(AnalyticsContent.CallToActionConversion)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsMetricPercentage ratio={metrics.conversionRate} />
            <p className="mt-2 text-xs text-muted-foreground">
              {AnalyticsFormat.count(metrics.clicks)} {translate(AnalyticsContent.Of)}{' '}
              {AnalyticsFormat.count(metrics.started)}{' '}
              {translate(AnalyticsContent.StartsClickedAction)}
            </p>
            <AnalyticsVariantMetricDetails
              version={version}
              metric={AnalyticsSummaryMetric.CallToActionConversion}
            />
            <AnalyticsMetricComparison
              version={version}
              metric={AnalyticsSummaryMetric.CallToActionConversion}
            />
          </CardContent>
        </Card>
      </div>
      <div className="grid min-w-0 gap-5 @min-[62rem]/marketing:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <ChartNoAxesCombined className="size-4 text-primary" />
                {translate(AnalyticsContent.SessionMilestones)}
              </CardTitle>
              <Badge variant="outline">
                {translate(AnalyticsContent.Version)} {version.funnelVersion}
              </Badge>
            </div>
            <CardDescription>{translate(AnalyticsContent.RibbonDescription)}</CardDescription>
          </CardHeader>
          <CardContent className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 px-3 text-center text-[11px] text-muted-foreground sm:text-xs">
              <span>{translate(AnalyticsContent.Started)}</span>
              <span>{translate(AnalyticsContent.ResultViewed)}</span>
              <span>{translate(AnalyticsContent.ResultViewersClicked)}</span>
            </div>
            {metrics.started > 0 ? (
              version.variants.map((variant) => (
                <AnalyticsMarketingRibbon
                  key={variant.variant}
                  variant={variant}
                  maximum={maximum}
                />
              ))
            ) : (
              <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-muted/30 px-5 py-6 text-center">
                <ChartNoAxesCombined className="size-7 text-muted-foreground" />
                <p className="text-sm font-medium">{translate(AnalyticsContent.EmptyMilestones)}</p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {translate(AnalyticsContent.EmptyMilestonesDescription)}
                </p>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {translate(AnalyticsContent.MilestonesDescription)}
            </p>
            <table className="sr-only">
              <caption>{translate(AnalyticsContent.MilestonesCaption)}</caption>
              <thead>
                <tr>
                  <th>{translate(AnalyticsContent.Variant)}</th>
                  <th>{translate(AnalyticsContent.Started)}</th>
                  <th>{translate(AnalyticsContent.ResultViewed)}</th>
                  <th>{translate(AnalyticsContent.ResultViewersClicked)}</th>
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
              {translate(AnalyticsContent.VariantComparison)}
            </CardTitle>
            <CardDescription>{translate(AnalyticsContent.ConversionDifference)}</CardDescription>
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
                  <p className="text-sm font-medium">
                    {translate(AnalyticsContent.EmptyComparison)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {translate(AnalyticsContent.EmptyComparisonDescription)}
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
                    {translate(AnalyticsContent.DifferenceDescription)}
                  </p>
                </>
              )}
            </div>
            <div className="grid gap-4">
              {version.variants.map((variant) => (
                <div key={variant.variant} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {translate(AnalyticsContent.Variant)} {variant.variant}
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
                <span className="text-sm">{translate(AnalyticsContent.ResultToAction)}</span>
                <ArrowRight className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isNull(metrics.clickThrough.value)
                  ? '—'
                  : AnalyticsFormat.ratio(metrics.clickThrough)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {translate(AnalyticsContent.ClickThroughDescription)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
