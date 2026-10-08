import type { AnalyticsResponse } from '../management/management-types';
import { Button } from '../components/button';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsReportContent as Content } from './analytics-report-content';
import { AnalyticsReportOperations as Report } from './analytics-report-operations';
import type { ReportSelection } from './analytics-report-state';

interface SegmentsProperties {
  readonly response: AnalyticsResponse;
  readonly selection: ReportSelection;
  readonly onApply: (selection: ReportSelection) => void;
}

export function AnalyticsReportSegments({ response, selection, onApply }: SegmentsProperties) {
  const { t } = useLocalization();
  const insights = response.insights;
  if (!insights) { return null; }

  return <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <section className="min-w-0 rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{t(Content.Segment)}</h3><Button size="sm" variant="ghost" disabled={!selection.sourceSelected && !selection.mediumSelected && !selection.campaignSelected} onClick={() => onApply({ ...selection, sourceSelected: false, mediumSelected: false, campaignSelected: false })}>{t(Content.ClearSegments)}</Button></div>
      <p className="mt-1 text-sm text-muted-foreground">{t(Content.SegmentsDescription)}</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{[Content.Source, Content.Medium, Content.Campaign, Content.Started, Content.Rate, Content.Inspect].map((label) => <th key={label} className="px-2 py-3 text-xs font-medium text-muted-foreground">{t(label)}</th>)}</tr></thead><tbody>{insights.acquisition.map((segment) => <tr key={JSON.stringify([segment.source, segment.medium, segment.campaign])} className="border-t"><td className="p-2">{segment.source || t(Content.Unattributed)}</td><td className="p-2">{segment.medium || t(Content.Unattributed)}</td><td className="p-2">{segment.campaign || t(Content.Unattributed)}</td><td className="p-2 tabular-nums">{segment.started}</td><td className="p-2 tabular-nums">{Report.percentage(segment.clicks, segment.started)}<span className="block text-xs text-muted-foreground">{segment.clicks} / {segment.started}</span></td><td className="p-2"><Button size="sm" variant="outline" aria-label={t(Content.SelectSegment)} onClick={() => onApply({ ...selection, source: segment.source, medium: segment.medium, campaign: segment.campaign, sourceSelected: true, mediumSelected: true, campaignSelected: true })}>→</Button></td></tr>)}</tbody></table></div>
      {insights.acquisitionHasMore && <p className="mt-2 text-xs text-muted-foreground">{t(Content.Truncated)}</p>}
    </section>
    <section className="min-w-0 rounded-xl border bg-card p-4"><h3 className="font-semibold">{t(Content.ResultsDistribution)}</h3><div className="mt-4 grid gap-4">{insights.results.map((result) => {
      const maximum = Math.max(1, ...insights.results.map((item) => item.sessions));

      return <div key={result.resultIdentifier}><div className="flex justify-between gap-2 text-sm"><span className="break-all">{result.resultIdentifier}</span><span className="shrink-0 tabular-nums">{result.sessions}</span></div><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${result.sessions / maximum * 100}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{t(Content.Opens)}: {result.clicks}</p></div>;
    })}</div>{insights.results.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{t(Content.NoResult)}</p>}{insights.resultsHasMore && <p className="mt-2 text-xs text-muted-foreground">{t(Content.Truncated)}</p>}</section>
  </div>;
}
