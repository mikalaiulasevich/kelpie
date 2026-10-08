export const AnalyticsReportPolicy = {
  DefaultDays: 7,
  DefaultWindowHours: 24,
  MaximumDays: 366,
  MaximumSavedReports: 20,
  MaximumReportNameLength: 80,
  SavedReportsKey: 'kelpie.analytics.saved-reports',
  MillisecondsPerDay: 86_400_000,
  MillisecondsPerHour: 3_600_000,
  CalendarBoundarySearchMilliseconds: 2 * 86_400_000,
  DefaultTimezone: 'UTC',
  Timezones: ['UTC', 'Europe/Minsk', 'Europe/London', 'America/New_York', 'Australia/Sydney'],
  WindowHours: [1, 24, 72, 168],
} as const;
