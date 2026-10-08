import { useState, type FormEvent } from 'react';
import { CalendarDays, Link, Save, Download } from 'lucide-react';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsReportContent as Content } from './analytics-report-content';
import { AnalyticsReportPolicy } from './analytics-report-policy';
import { AnalyticsReportDates, AnalyticsReportState, type ReportSelection, type SavedReport } from './analytics-report-state';

interface ReportControlsProperties {
  readonly selection: ReportSelection;
  readonly funnelIdentifier: string;
  readonly onApply: (selection: ReportSelection) => void;
  readonly onExport?: () => void;
}

export function AnalyticsReportControls({ selection, funnelIdentifier, onApply, onExport }: ReportControlsProperties) {
  const { t } = useLocalization();
  const [draft, setDraft] = useState(selection);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<SavedReport[]>(() => {
    try { return AnalyticsReportState.saved(localStorage); } catch { return []; }
  });
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!AnalyticsReportDates.period(draft)) { setMessage(Content.InvalidPeriod); return; }
    setMessage('');
    onApply(draft);
  };
  const preset = (days: number) => {
    const endDate = AnalyticsReportDates.dateInTimezone(new Date(), draft.timezone);
    const next = { ...draft, endDate, startDate: AnalyticsReportDates.addDays(endDate, 1 - days) };
    setDraft(next);
    onApply(next);
  };
  const save = () => {
    if (!name.trim()) { return; }
    try {
      AnalyticsReportState.save(localStorage, { name: name.trim(), funnelIdentifier, selection });
      setSaved(AnalyticsReportState.saved(localStorage)); setMessage(Content.ReportSaved); setName('');
    } catch { setMessage(Content.StorageFailed); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}${AnalyticsReportState.hash(funnelIdentifier, selection)}`); setMessage(Content.LinkCopied); } catch { setMessage(Content.CopyFailed); }
  };

  return <section className="rounded-xl border bg-card p-4" aria-label={t(Content.Period)}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2"><CalendarDays className="mr-1 size-5 self-center text-primary" />
        <Button size="sm" variant="outline" onClick={() => preset(1)}>{t(Content.Today)}</Button>
        <Button size="sm" variant="outline" onClick={() => preset(7)}>{t(Content.LastSeven)}</Button>
        <Button size="sm" variant="outline" onClick={() => preset(30)}>{t(Content.LastThirty)}</Button>
      </div>
      <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => { void copy(); }}><Link />{t(Content.CopyLink)}</Button><Button size="sm" variant="outline" disabled={!onExport} onClick={onExport}><Download />{t(Content.Export)}</Button></div>
    </div>
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1.5 text-sm">{t(Content.From)}<Input type="date" required value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
      <label className="grid gap-1.5 text-sm">{t(Content.Through)}<Input type="date" required value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
      <label className="grid gap-1.5 text-sm">{t(Content.Timezone)}<select className="report-select" value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}>{[...new Set([...AnalyticsReportPolicy.Timezones, draft.timezone])].map((timezone) => <option key={timezone}>{timezone}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm">{t(Content.Window)}<select className="report-select" value={draft.conversionWindowHours} onChange={(event) => setDraft({ ...draft, conversionWindowHours: Number(event.target.value) })}>{[...new Set([...AnalyticsReportPolicy.WindowHours, draft.conversionWindowHours])].map((hours) => <option key={hours} value={hours}>{t(Content.Hours, { hours })}</option>)}</select></label>
      <Button type="submit">{t(Content.Apply)}</Button>
    </form>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(Content.PeriodExplanation)}</p>
    <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm">{t(Content.Saved)}</summary><div className="mt-3 flex flex-wrap gap-2">
      <Input className="max-w-64" aria-label={t(Content.Name)} placeholder={t(Content.Name)} maxLength={AnalyticsReportPolicy.MaximumReportNameLength} value={name} onChange={(event) => setName(event.target.value)} />
      <Button variant="outline" disabled={!name.trim()} onClick={save}><Save />{t(Content.Save)}</Button>
      {saved.filter((report) => report.funnelIdentifier === funnelIdentifier).map((report) => <Button key={report.name} variant="secondary" onClick={() => { setDraft(report.selection); onApply(report.selection); }}>{report.name}</Button>)}
    </div><p className="mt-2 text-sm text-muted-foreground">{t(Content.LocalReports)}</p></details>
    {message && <p className="mt-3 text-sm" role="status">{t(message)}</p>}
  </section>;
}
