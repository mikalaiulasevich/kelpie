import { isNull, isUndefined } from 'es-toolkit/predicate';
import {
  Users,
  CircleCheck,
  MousePointer2,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Clock3,
} from 'lucide-react';
import type { AnalyticsResponse } from '../management/management-types';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsReportContent as Content } from './analytics-report-content';
import { AnalyticsReportOperations as Report } from './analytics-report-operations';

export function AnalyticsReportOverview({ response }: { readonly response: AnalyticsResponse }) {
  const { t } = useLocalization();
  const variants = response.versions.flatMap((version) => version.variants);
  const started = variants.reduce((total, variant) => total + variant.started, 0);
  const results = variants.reduce(
    (total, variant) => total + variant.resultCompletion.numerator,
    0,
  );
  const opens = variants.reduce((total, variant) => total + variant.ctaConversion.numerator, 0);
  const previous = response.insights?.previousPeriod;
  const quality = response.insights?.quality;
  const metrics = [
    {
      label: Content.Started,
      count: started,
      icon: Users,
      tone: 'bg-info/10 text-info',
      bar: 'bg-info',
      previous: previous?.started,
      rate: false,
    },
    {
      label: Content.Results,
      count: results,
      icon: CircleCheck,
      tone: 'bg-success/10 text-success',
      bar: 'bg-success',
      previous: previous?.results,
      rate: true,
    },
    {
      label: Content.Opens,
      count: opens,
      icon: MousePointer2,
      tone: 'bg-primary/10 text-primary',
      bar: 'bg-primary',
      previous: previous?.clicks,
      rate: true,
    },
  ];

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const difference =
            metric.rate &&
            previous &&
            previous.started > 0 &&
            started > 0 &&
            !isUndefined(metric.previous)
              ? (metric.count / started - metric.previous / previous.started) * 100
              : null;

          return (
            <section key={metric.label} className="flex flex-col rounded-xl border bg-card p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${metric.tone}`}
                >
                  <Icon className="size-4" />
                </span>
                {t(metric.label)}
              </h3>
              <p className="mt-4 text-4xl leading-none font-medium tracking-tight tabular-nums">
                {metric.rate
                  ? Report.percentageParts(metric.count, started).map((part, index) => (
                      <span
                        key={`${part.type}-${index}`}
                        className={
                          part.type === 'percentSign'
                            ? 'ml-0.5 text-xl text-muted-foreground'
                            : undefined
                        }
                      >
                        {part.value}
                      </span>
                    ))
                  : metric.count}
              </p>
              <p className="mt-3 mb-3 text-sm text-muted-foreground">
                {metric.rate
                  ? t(Content.Sample, { numerator: metric.count, denominator: started })
                  : t(Content.SelectedCohort)}
              </p>
              {metric.rate && (
                <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${metric.bar}`}
                    style={{ width: `${Report.rate(metric.count, started) ?? 0}%` }}
                  />
                </div>
              )}
              {!isNull(difference) && (
                <p
                  data-direction={Math.sign(difference)}
                  className={`mt-auto border-t pt-3 text-sm tabular-nums data-[direction='-1']:text-destructive data-[direction='1']:text-success ${difference === 0 ? 'text-muted-foreground' : ''}`}
                >
                  {t(Content.Difference, {
                    difference: `${difference > 0 ? '+' : ''}${difference.toFixed(1)}`,
                  })}
                </p>
              )}
              {!metric.rate && previous && (
                <p className="mt-auto border-t pt-3 text-sm text-muted-foreground">
                  {t(Content.Previous)}: {previous.started}
                </p>
              )}
              {metric.rate && isNull(difference) && (
                <p className="mt-auto border-t pt-3 text-xs text-muted-foreground">
                  {t(Content.NoComparison)}
                </p>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        {t(Content.Engagement)} {t(started < 2 ? Content.Insufficient : Content.Observed)}
      </p>
      {started === 0 && (
        <div className="rounded-lg border border-info/30 bg-info/5 p-4">
          <p className="font-medium">{t(Content.NoTraffic)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t(Content.NoTrafficHelp)}</p>
        </div>
      )}
      {quality && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-info" />
            {t(Content.Quality)}
          </h3>
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
            <div className="analytics-accent-card rounded-lg border p-4" data-tone="info">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Activity aria-hidden="true" className="size-4 shrink-0 text-info" />
                {t(Content.LastEvent)}
              </p>
              <p className="mt-3 font-medium leading-relaxed">
                {quality.latestEventAt
                  ? Report.timestamp(quality.latestEventAt, response.filters.timezone)
                  : t(Content.NoEvents)}
              </p>
            </div>
            <div
              className="analytics-accent-card rounded-lg border p-4"
              data-tone={quality.missingStepViews > 0 ? 'warning' : 'success'}
            >
              <p className="flex items-center gap-2 text-muted-foreground">
                {quality.missingStepViews > 0 ? (
                  <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-warning" />
                ) : (
                  <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
                )}

                {t(Content.MissingViewsTitle)}
              </p>
              <p
                className={`mt-3 text-2xl font-medium tabular-nums ${quality.missingStepViews > 0 ? 'text-warning' : 'text-success'}`}
              >
                {quality.missingStepViews}
              </p>
              <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
                {t(Content.MissingDescription)}
              </p>
            </div>
            <div className="analytics-accent-card rounded-lg border p-4" data-tone="violet">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock3 aria-hidden="true" className="size-4 shrink-0 text-violet" />
                {t(Content.Window)}
              </p>
              <dl className="mt-3 grid gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <dt>{t(Content.MatureSessions)}</dt>
                  <dd className="text-xl font-medium tabular-nums">{quality.matureSessions}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt>{t(Content.PendingSessions)}</dt>
                  <dd className="text-xl font-medium tabular-nums text-violet">
                    {quality.openSessions}
                  </dd>
                </div>
              </dl>
              {quality.matureSessions < started && (
                <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
                  {t(Content.StillObserving)}
                </p>
              )}
            </div>
          </div>
          {response.filters.trafficOrigin !== 'production' && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning/8 px-3 py-2.5 text-sm leading-relaxed text-warning">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t(Content.TestTraffic)}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
