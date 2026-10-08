import { describe, expect, it } from 'vitest';
import { AnalyticsReportOperations } from '../../source/analytics/analytics-report-operations';

describe('publication markers on daily cohorts', () => {
  it('groups changes by report timezone and retains every revision and action', () => {
    const publications = [
      {
        occurredAt: '2026-10-07T20:59:00Z',
        versionIdentifier: 'first',
        revision: 1,
        action: 'publish',
      },
      {
        occurredAt: '2026-10-07T21:00:00Z',
        versionIdentifier: 'second',
        revision: 2,
        action: 'publish',
      },
      {
        occurredAt: '2026-10-08T04:00:00Z',
        versionIdentifier: 'first',
        revision: 3,
        action: 'rollback',
      },
    ];
    const grouped = AnalyticsReportOperations.publicationsByDay(publications, 'Europe/Minsk');

    expect(Object.keys(grouped)).toEqual(['2026-10-07', '2026-10-08']);
    expect(grouped['2026-10-07']).toEqual([publications[0]]);
    expect(grouped['2026-10-08']).toEqual([publications[1], publications[2]]);
    expect(AnalyticsReportOperations.publicationsByDay([], 'UTC')).toEqual({});
  });
});
