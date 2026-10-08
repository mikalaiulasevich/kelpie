import { useState, type FormEvent } from 'react';
import { CalendarDays, Link, Save, Download, Info, ChevronDown, Clock3 } from 'lucide-react';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsReportContent as Content } from './analytics-report-content';
import { AnalyticsReportDraft } from './analytics-report-draft';
import { AnalyticsReportPolicy } from './analytics-report-policy';
import {
  AnalyticsReportDates,
  AnalyticsReportState,
  type ReportSelection,
  type SavedReport,
} from './analytics-report-state';

interface ReportControlsProperties {
  readonly selection: ReportSelection;
  readonly funnelIdentifier: string;
  readonly onApply: (selection: ReportSelection) => void;
  readonly onExport?: Optional<() => void>;
}

export function AnalyticsReportControls({
  selection,
  funnelIdentifier,
  onApply,
  onExport,
}: ReportControlsProperties) {
  const { t } = useLocalization();
  const [draft, setDraft] = useState(selection);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<SavedReport[]>(() => {
    try {
      return AnalyticsReportState.saved(localStorage);
    } catch {
      return [];
    }
  });
  const hasPendingChanges =
    draft.startDate !== selection.startDate ||
    draft.endDate !== selection.endDate ||
    draft.timezone !== selection.timezone ||
    draft.conversionWindowHours !== selection.conversionWindowHours;
  const today = AnalyticsReportDates.dateInTimezone(new Date(), draft.timezone);
  const matchesPreset = (days: number) =>
    draft.endDate === today && draft.startDate === AnalyticsReportDates.addDays(today, 1 - days);
  const updateDraft = (next: ReportSelection) => {
    setMessage('');
    setDraft(next);
  };

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!AnalyticsReportDates.period(draft)) {
      setMessage(Content.InvalidPeriod);

      return;
    }

    setMessage('');
    onApply(AnalyticsReportDraft.merge(selection, draft));
  };

  const preset = (days: number) => {
    const endDate = AnalyticsReportDates.dateInTimezone(new Date(), draft.timezone);
    const next = { ...AnalyticsReportDraft.merge(selection, draft), endDate, startDate: AnalyticsReportDates.addDays(endDate, 1 - days) };
    updateDraft(next);
    onApply(next);
  };

  const save = () => {
    if (!name.trim()) {
      return;
    }

    try {
      AnalyticsReportState.save(localStorage, { name: name.trim(), funnelIdentifier, selection });
      setSaved(AnalyticsReportState.saved(localStorage));
      setMessage(Content.ReportSaved);
      setName('');
    } catch {
      setMessage(Content.StorageFailed);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}${location.pathname}${AnalyticsReportState.hash(funnelIdentifier, selection)}`,
      );
      setMessage(Content.LinkCopied);
    } catch {
      setMessage(Content.CopyFailed);
    }
  };

  return (
    <section className="rounded-xl border bg-card p-4" aria-label={t(Content.Period)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <CalendarDays aria-hidden="true" className="mr-2 size-4 text-primary" />
          <Button
            size="sm"
            variant={matchesPreset(1) ? 'secondary' : 'ghost'}
            aria-pressed={matchesPreset(1)}
            className="aria-pressed:text-primary"
            onClick={() => preset(1)}
          >
            {t(Content.Today)}
          </Button>
          <Button
            size="sm"
            variant={matchesPreset(7) ? 'secondary' : 'ghost'}
            aria-pressed={matchesPreset(7)}
            className="aria-pressed:text-primary"
            onClick={() => preset(7)}
          >
            {t(Content.LastSeven)}
          </Button>
          <Button
            size="sm"
            variant={matchesPreset(30) ? 'secondary' : 'ghost'}
            aria-pressed={matchesPreset(30)}
            className="aria-pressed:text-primary"
            onClick={() => preset(30)}
          >
            {t(Content.LastThirty)}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={hasPendingChanges}
            onClick={() => {
              void copy();
            }}
          >
            <Link />
            {t(Content.CopyLink)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!onExport || hasPendingChanges}
            onClick={onExport}
          >
            <Download />
            {t(Content.Export)}
          </Button>
        </div>
      </div>
      <form
        onSubmit={apply}
        className="grid grid-cols-2 items-end gap-3 md:grid-cols-[1fr_1fr_1.2fr_1fr_auto]"
      >
        <label className="grid min-w-0 gap-1.5 text-sm">
          {t(Content.From)}
          <Input
            type="date"
            required
            value={draft.startDate}
            onChange={(event) => updateDraft({ ...draft, startDate: event.target.value })}
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm">
          {t(Content.Through)}
          <Input
            type="date"
            required
            value={draft.endDate}
            onChange={(event) => updateDraft({ ...draft, endDate: event.target.value })}
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm">
          {t(Content.Timezone)}
          <select
            className="report-select w-full min-w-0"
            value={draft.timezone}
            onChange={(event) => updateDraft({ ...draft, timezone: event.target.value })}
          >
            {[...new Set([...AnalyticsReportPolicy.Timezones, draft.timezone])].map((timezone) => (
              <option key={timezone}>{timezone}</option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm">
          {t(Content.Window)}
          <select
            className="report-select w-full min-w-0"
            value={draft.conversionWindowHours}
            onChange={(event) =>
              updateDraft({ ...draft, conversionWindowHours: Number(event.target.value) })
            }
          >
            {[...new Set([...AnalyticsReportPolicy.WindowHours, draft.conversionWindowHours])].map(
              (hours) => (
                <option key={hours} value={hours}>
                  {t(Content.Hours, { hours })}
                </option>
              ),
            )}
          </select>
        </label>
        <Button type="submit" className="col-span-2 md:col-span-1" disabled={!hasPendingChanges}>
          {t(Content.Apply)}
        </Button>
      </form>
      {hasPendingChanges && (
        <p className="mt-3 flex items-center gap-2 text-sm text-primary" role="status">
          <Clock3 aria-hidden="true" className="size-4 shrink-0" />
          {t(Content.PendingPeriod)}
        </p>
      )}
      <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <p>{t(Content.PeriodExplanation)}</p>
      </div>
      <details className="group mt-3 border-t pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
          <Save aria-hidden="true" className="size-4 text-muted-foreground" />
          {t(Content.Saved)}
          <span className="text-xs tabular-nums text-muted-foreground">
            {saved.filter((report) => report.funnelIdentifier === funnelIdentifier).length}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="ml-auto size-4 text-muted-foreground group-open:rotate-180"
          />
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            className="max-w-64"
            aria-label={t(Content.Name)}
            placeholder={t(Content.Name)}
            maxLength={AnalyticsReportPolicy.MaximumReportNameLength}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button variant="outline" disabled={!name.trim() || hasPendingChanges} onClick={save}>
            <Save />
            {t(Content.Save)}
          </Button>
          {saved
            .filter((report) => report.funnelIdentifier === funnelIdentifier)
            .map((report) => (
              <Button
                key={report.name}
                variant="secondary"
                onClick={() => {
                  updateDraft(report.selection);
                  onApply(report.selection);
                }}
              >
                {report.name}
              </Button>
            ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t(Content.LocalReports)}</p>
      </details>
      {message && (
        <p className="mt-3 text-sm" role="status">
          {t(message)}
        </p>
      )}
    </section>
  );
}
