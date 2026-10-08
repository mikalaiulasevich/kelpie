import { ChevronDown, History, Table2 } from 'lucide-react';
import { useId } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsResponse } from '../management/management-types';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsReportContent as Content } from './analytics-report-content';
import { AnalyticsReportOperations as Report } from './analytics-report-operations';

export function AnalyticsReportTrend({ response }: { readonly response: AnalyticsResponse }) {
  const { t } = useLocalization();
  const titleIdentifier = useId();
  const insights = response.insights;

  if (!insights) {
    return null;
  }

  const publicationsByDay = Report.publicationsByDay(
    insights.publications,
    insights.period.timezone,
  );
  const points = insights.trend.map((point) => ({
    ...point,
    rate: Report.rate(point.clicks, point.started),
  }));

  return (
    <section className="min-w-0 rounded-xl border bg-card p-4" aria-labelledby={titleIdentifier}>
      <h3 id={titleIdentifier} className="font-semibold">
        {t(Content.Trend)}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{t(Content.TrendDescription)}</p>
      <div className="mt-4 h-64 min-w-0" role="img" aria-label={t(Content.Trend)}>
        <ComposedChart
          responsive
          width="100%"
          height="100%"
          data={points}
          margin={{ top: 12, right: 10, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            tickFormatter={(date: string) => date.slice(5)}
          />
          <YAxis
            yAxisId="count"
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            width={40}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[0, 100]}
            unit="%"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            width={48}
          />
          {Object.entries(publicationsByDay).map(([date, publications]) => (
            <ReferenceLine
              key={date}
              yAxisId="count"
              x={date}
              stroke="var(--warning)"
              strokeDasharray="4 4"
              label={{
                value: t(Content.PublicationCount, { count: publications.length }),
                fill: 'var(--warning)',
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />
          ))}
          <Tooltip
            labelFormatter={(label) => Report.cohortDate(String(label))}
            formatter={(value, name, item) => [
              typeof value === 'number' && item.dataKey === 'rate'
                ? Report.percentage(value, 100)
                : value,
              name,
            ]}
            contentStyle={{
              background: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 8,
              color: 'var(--foreground)',
            }}
          />
          <Bar
            yAxisId="count"
            dataKey="started"
            name={t(Content.Started)}
            fill="var(--info)"
            opacity={0.45}
            maxBarSize={28}
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="rate"
            dataKey="rate"
            name={t(Content.Rate)}
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </ComposedChart>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs">
        <span className="text-info">● {t(Content.Started)}</span>
        <span className="text-primary">● {t(Content.Rate)}</span>
      </div>
      {insights.publications.length > 0 && (
        <div className="mt-4 grid gap-2 border-t pt-3">
          {Object.entries(publicationsByDay).map(([date, publications]) => (
            <details
              key={date}
              className="analytics-disclosure rounded-lg border bg-muted/20 px-2 text-sm"
            >
              <summary>
                <History aria-hidden="true" className="size-4 shrink-0 text-warning" />
                {Report.cohortDate(date)} ·{' '}
                {t(Content.PublicationCount, { count: publications.length })}
                <ChevronDown aria-hidden="true" className="analytics-disclosure-chevron" />
              </summary>
              <ul className="mt-2 grid gap-2 border-t pt-2">
                {publications.map((publication) => (
                  <li
                    key={publication.revision}
                    className="flex flex-wrap justify-between gap-x-3 text-xs"
                  >
                    <span>
                      {t(publication.action === 'rollback' ? 'Rolled back' : 'Published')} · r
                      {publication.revision}
                    </span>
                    <time dateTime={publication.occurredAt} className="text-muted-foreground">
                      {Report.timestamp(publication.occurredAt, response.filters.timezone)}
                    </time>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
      {insights.publicationsHasMore && (
        <p className="mt-2 text-xs text-muted-foreground">{t(Content.Truncated)}</p>
      )}
      <details className="analytics-disclosure mt-3 border-t pt-1">
        <summary className="text-sm text-muted-foreground">
          <Table2 aria-hidden="true" className="size-4 shrink-0 text-info" />
          {t(Content.ViewData)}
          <ChevronDown aria-hidden="true" className="analytics-disclosure-chevron" />
        </summary>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr>
                {[Content.Date, Content.Started, Content.Results, Content.Opens, Content.Rate].map(
                  (heading) => (
                    <th className="p-2" key={heading}>
                      {t(heading)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr className="border-t" key={point.date}>
                  <td className="p-2">{Report.cohortDate(point.date)}</td>
                  <td>{point.started}</td>
                  <td>{point.results}</td>
                  <td>{point.clicks}</td>
                  <td>{Report.percentage(point.clicks, point.started)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
