import { Ajv } from 'ajv';
import { Type, type Static } from 'typebox';
import { AnalyticsReportPolicy } from './analytics-report-policy';

const ReportSelectionSchema = Type.Object({
  startDate: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  endDate: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  timezone: Type.String({ minLength: 1, maxLength: 100 }),
  conversionWindowHours: Type.Integer({ minimum: 1, maximum: 2160 }),
  source: Type.String({ maxLength: 200 }),
  medium: Type.String({ maxLength: 200 }),
  campaign: Type.String({ maxLength: 200 }),
  trafficOrigin: Type.Enum({ Production: 'production', Synthetic: 'synthetic', All: 'all' } as const),
  includeForced: Type.Boolean(),
  versionIdentifier: Type.String({ maxLength: 100 }),
});
const SavedReportSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: AnalyticsReportPolicy.MaximumReportNameLength }),
  funnelIdentifier: Type.String({ maxLength: 100 }),
  selection: ReportSelectionSchema,
});
const validateSelection = new Ajv().compile<ReportSelection>(ReportSelectionSchema);
const validateSaved = new Ajv().compile<SavedReport[]>(Type.Array(SavedReportSchema, { maxItems: AnalyticsReportPolicy.MaximumSavedReports }));

export type ReportSelection = Static<typeof ReportSelectionSchema>;

export type SavedReport = Static<typeof SavedReportSchema>;

export const AnalyticsReportDates = {
  dateInTimezone(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${values.year}-${values.month}-${values.day}`;
  },

  addDays(value: string, days: number): string {
    return new Date(Date.parse(`${value}T00:00:00Z`) + days * AnalyticsReportPolicy.MillisecondsPerDay).toISOString().slice(0, 10);
  },

  startOfDay(value: string, timezone: string): string {
    const target = Date.parse(`${value}T00:00:00Z`);
    let instant = target;
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

    for (let pass = 0; pass < AnalyticsReportPolicy.TimezoneConversionPasses; pass += 1) {
      const values = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
      const observed = Date.parse(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`);
      const adjustment = target - observed;
      instant += adjustment;
      if (adjustment === 0) {
        break;
      }
    }

    return new Date(instant).toISOString();
  },

  period(selection: ReportSelection): { from: string; to: string } | null {
    try {
      const start = Date.parse(`${selection.startDate}T00:00:00Z`);
      const end = Date.parse(`${selection.endDate}T00:00:00Z`);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start >= AnalyticsReportPolicy.MaximumDays * AnalyticsReportPolicy.MillisecondsPerDay || new Date(start).toISOString().slice(0, 10) !== selection.startDate || new Date(end).toISOString().slice(0, 10) !== selection.endDate) {
        return null;
      }

      return { from: this.startOfDay(selection.startDate, selection.timezone), to: this.startOfDay(this.addDays(selection.endDate, 1), selection.timezone) };
    } catch {
      return null;
    }
  },
} as const;

export const AnalyticsReportState = {
  initial(now = new Date()): ReportSelection {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || AnalyticsReportPolicy.DefaultTimezone;
    const endDate = AnalyticsReportDates.dateInTimezone(now, timezone);

    return { startDate: AnalyticsReportDates.addDays(endDate, 1 - AnalyticsReportPolicy.DefaultDays), endDate, timezone, conversionWindowHours: AnalyticsReportPolicy.DefaultWindowHours, source: '', medium: '', campaign: '', trafficOrigin: 'production', includeForced: false, versionIdentifier: '' };
  },

  fromHash(hash: string, now = new Date()): ReportSelection {
    const initial = this.initial(now);
    const parameters = new URLSearchParams(hash.split('?')[1] ?? '');
    const candidate = { ...initial, ...Object.fromEntries(['startDate', 'endDate', 'timezone', 'source', 'medium', 'campaign', 'versionIdentifier', 'trafficOrigin'].flatMap((key) => parameters.has(key) ? [[key, parameters.get(key)]] : [])), conversionWindowHours: parameters.has('conversionWindowHours') ? Number(parameters.get('conversionWindowHours')) : initial.conversionWindowHours, includeForced: parameters.get('includeForced') === 'true' };

    return validateSelection(candidate) && AnalyticsReportDates.period(candidate) ? candidate : initial;
  },

  hash(funnelIdentifier: string, selection: ReportSelection): string {
    const parameters = new URLSearchParams({ funnel: funnelIdentifier });
    for (const [key, value] of Object.entries(selection)) {
      parameters.set(key, String(value));
    }

    return `#analytics?${parameters}`;
  },

  saved(storage: Pick<Storage, 'getItem'>): SavedReport[] {
    const value: unknown = JSON.parse(storage.getItem(AnalyticsReportPolicy.SavedReportsKey) ?? '[]');

    return validateSaved(value) ? value : [];
  },

  save(storage: Pick<Storage, 'getItem' | 'setItem'>, report: SavedReport): void {
    const reports = this.saved(storage).filter((saved) => saved.name !== report.name || saved.funnelIdentifier !== report.funnelIdentifier);
    const next = [report, ...reports].slice(0, AnalyticsReportPolicy.MaximumSavedReports);
    storage.setItem(AnalyticsReportPolicy.SavedReportsKey, JSON.stringify(next));
  },
} as const;
