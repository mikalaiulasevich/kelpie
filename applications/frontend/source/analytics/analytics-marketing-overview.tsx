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
import type { AnalyticsVariant, AnalyticsVersion } from '../management/management-types';
import { AnalyticsFormat } from './analytics-format';
import { AnalyticsMarketingMetrics } from './analytics-marketing-metrics';

function MarketingRibbon({
  variant,
  maximum,
}: {
  readonly variant: AnalyticsVariant;
  readonly maximum: number;
}) {
  const counts = [
    variant.started,
    variant.resultCompletion.numerator,
    variant.ctaClickThrough.numerator,
  ];
  const tone = variant.variant === 'A' ? 'text-primary' : 'text-success';

  return (
    <div className="min-w-0 rounded-2xl bg-background/25 px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`flex items-center gap-2 text-sm font-medium ${tone}`}>
          <span className="size-2 rounded-full bg-current" />
          Variant {variant.variant}
        </span>
        <span className="text-xs text-muted-foreground">
          {AnalyticsFormat.ratio(variant.ctaClickThrough)} result → CTA
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
        <p className="mt-2 text-xs text-muted-foreground">No started sessions for this variant.</p>
      )}
    </div>
  );
}

export function AnalyticsMarketingOverview({ version }: { readonly version: AnalyticsVersion }) {
  const metrics = AnalyticsMarketingMetrics.summarize(version);
  const maximum = Math.max(...version.variants.map((variant) => variant.started), 0);

  return (
    <section
      className="@container/marketing grid min-w-0 gap-5"
      aria-label="Marketing performance overview"
    >
      <div className="grid min-w-0 gap-3 @min-[36rem]/marketing:grid-cols-3">
        <Card className="compact-card min-w-0 gap-3 bg-primary/5">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Started sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">
              {AnalyticsFormat.count(metrics.started)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Across selected variants</p>
          </CardContent>
        </Card>
        <Card className="compact-card min-w-0 gap-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <CircleCheck className="size-4 text-success" />
              Result completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {isNull(metrics.resultRate.value) ? '—' : AnalyticsFormat.ratio(metrics.resultRate)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {AnalyticsFormat.count(metrics.results)} sessions viewed a result
            </p>
          </CardContent>
        </Card>
        <Card className="compact-card min-w-0 gap-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <MousePointer2 className="size-4 text-primary" />
              CTA conversion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {isNull(metrics.conversionRate.value)
                ? '—'
                : AnalyticsFormat.ratio(metrics.conversionRate)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {AnalyticsFormat.count(metrics.clicks)} sessions clicked a CTA
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid min-w-0 gap-5 @min-[62rem]/marketing:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <ChartNoAxesCombined className="size-4 text-primary" />
                Session milestones
              </CardTitle>
              <Badge variant="outline">Version {version.funnelVersion}</Badge>
            </div>
            <CardDescription>Ribbon width shows session count on a shared scale.</CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-3">
            <div className="grid grid-cols-3 gap-2 px-3 text-center text-[11px] text-muted-foreground sm:text-xs">
              <span>Started</span>
              <span>Result viewed</span>
              <span>Clicked after result</span>
            </div>
            {metrics.started > 0 ? (
              version.variants.map((variant) => (
                <MarketingRibbon key={variant.variant} variant={variant} maximum={maximum} />
              ))
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl bg-muted/30 px-5 text-center">
                <ChartNoAxesCombined className="size-7 text-muted-foreground" />
                <p className="text-sm font-medium">Your funnel will appear here</p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  No started sessions match the current filters. Milestones appear when traffic
                  reaches this version.
                </p>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Milestones across all branches. Sessions without a result may still be open.
            </p>
            <table className="sr-only">
              <caption>Session milestone counts by variant</caption>
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Started</th>
                  <th>Result viewed</th>
                  <th>Clicked after result</th>
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
              Variant comparison
            </CardTitle>
            <CardDescription>CTA conversion · B minus A</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="rounded-2xl bg-primary/5 p-5">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {AnalyticsMarketingMetrics.difference(metrics.conversionDifference)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Difference in percentage points; statistical significance is not tested.
              </p>
            </div>
            <div className="grid gap-4">
              {version.variants.map((variant) => (
                <div key={variant.variant} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>Variant {variant.variant}</span>
                    <span className="font-medium tabular-nums">
                      {AnalyticsFormat.ratio(variant.ctaConversion)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${variant.variant === 'A' ? 'bg-primary' : 'bg-success'}`}
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
                <span className="text-sm">Result → CTA</span>
                <ArrowRight className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isNull(metrics.clickThrough.value)
                  ? '—'
                  : AnalyticsFormat.ratio(metrics.clickThrough)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                CTA clicks / result views, across selected variants.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
