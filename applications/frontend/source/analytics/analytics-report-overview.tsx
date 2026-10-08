import { Users, CircleCheck, MousePointer2, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { AnalyticsResponse } from '../management/management-types';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsReportContent as Content } from './analytics-report-content';
import { AnalyticsReportOperations as Report } from './analytics-report-operations';

export function AnalyticsReportOverview({ response }: { readonly response: AnalyticsResponse }) {
  const { t } = useLocalization();
  const variants = response.versions.flatMap((version) => version.variants);
  const started = variants.reduce((total, variant) => total + variant.started, 0);
  const results = variants.reduce((total, variant) => total + variant.resultCompletion.numerator, 0);
  const opens = variants.reduce((total, variant) => total + variant.ctaConversion.numerator, 0);
  const previous = response.insights?.previousPeriod;
  const quality = response.insights?.quality;
  const metrics = [
    { label: Content.Started, count: started, icon: Users, previous: previous?.started, rate: false },
    { label: Content.Results, count: results, icon: CircleCheck, previous: previous?.results, rate: true },
    { label: Content.Opens, count: opens, icon: MousePointer2, previous: previous?.clicks, rate: true },
  ];

  return <div className="grid gap-3">
    <div className="grid gap-3 md:grid-cols-3">{metrics.map((metric) => {
      const Icon = metric.icon;
      const difference = metric.rate && previous && previous.started > 0 && started > 0 && metric.previous !== undefined ? (metric.count / started - metric.previous / previous.started) * 100 : null;

      return <section key={metric.label} className="rounded-xl border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium"><span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="size-4" /></span>{t(metric.label)}</h3>
        <p className="mt-4 text-4xl leading-none font-medium tracking-tight tabular-nums">{metric.rate ? Report.percentage(metric.count, started) : metric.count}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t(Content.Sample, { numerator: metric.count, denominator: started })}</p>
        {difference !== null && <p className={`mt-3 border-t pt-3 text-sm tabular-nums ${difference < 0 ? 'text-destructive' : 'text-success'}`}>{t(Content.Difference, { difference: `${difference > 0 ? '+' : ''}${difference.toFixed(1)}` })}</p>}
        {!metric.rate && previous && <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">{t(Content.Previous)}: {previous.started}</p>}
        {metric.rate && difference === null && <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">{t(Content.NoComparison)}</p>}
      </section>;
    })}</div>
    <p className="text-sm text-muted-foreground">{t(Content.Engagement)} {t(Content.Observed)}</p>
    {started === 0 && <div className="rounded-lg border border-info/30 bg-info/5 p-4"><p className="font-medium">{t(Content.NoTraffic)}</p><p className="mt-1 text-sm text-muted-foreground">{t(Content.NoTrafficHelp)}</p></div>}
    {quality && <section className="rounded-xl border bg-card p-4">
      <h3 className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-info" />{t(Content.Quality)}</h3>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3"><p>{t(Content.LastEvent)}<span className="mt-1 block text-muted-foreground">{quality.latestEventAt ? new Date(quality.latestEventAt).toLocaleString() : t(Content.NoEvents)}</span></p><p>{t(Content.MissingViews, { count: quality.missingStepViews })}<span className="mt-1 block text-muted-foreground">{t(Content.MissingDescription)}</span></p><p>{t(Content.QualitySummary, { mature: quality.matureSessions, open: quality.openSessions })}<span className="mt-1 block text-muted-foreground">{quality.matureSessions < started && t(Content.StillObserving)}</span></p></div>
      {response.filters.trafficOrigin !== 'production' && <p className="mt-3 flex items-center gap-2 text-sm text-warning"><AlertTriangle className="size-4" />{t(Content.TestTraffic)}</p>}
    </section>}
  </div>;
}
