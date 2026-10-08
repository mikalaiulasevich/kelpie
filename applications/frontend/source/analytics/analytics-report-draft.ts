import type { ReportSelection } from './analytics-report-state';

export const AnalyticsReportDraft = {
  periodKey(selection: ReportSelection): string {
    return JSON.stringify([
      selection.startDate,
      selection.endDate,
      selection.timezone,
      selection.conversionWindowHours,
    ]);
  },

  merge(selection: ReportSelection, draft: ReportSelection): ReportSelection {
    return {
      ...selection,
      startDate: draft.startDate,
      endDate: draft.endDate,
      timezone: draft.timezone,
      conversionWindowHours: draft.conversionWindowHours,
    };
  },
} as const;
