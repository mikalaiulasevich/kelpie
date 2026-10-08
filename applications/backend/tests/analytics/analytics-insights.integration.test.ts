import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { AnalyticsInsightFixture } from '../fixtures/analytics-insight-fixture.js';
import { AnalyticsService } from '../../source/analytics/analytics.service.js';

describe('analytics insight cohort boundaries and privacy', () => {
  let backend: BackendApplicationFixture;
  let versions: Awaited<ReturnType<typeof AnalyticsInsightFixture.prepare>>;

  beforeAll(async () => {
    backend = await AdministrationFixture.create();
    versions = await AnalyticsInsightFixture.prepare(backend);
  });

  afterAll(async () => {
    await backend?.close();
  });

  it('filters by session start with exclusive end and clips conversion observations by window', async () => {
    const response = await backend.getService(AnalyticsService).read({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.firstVersionIdentifier,
      campaign: 'launch',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
      conversionWindowHours: '1',
    });
    expect(response.versions[0]?.variants[0]).toMatchObject({
      started: 4,
      resultCompletion: { numerator: 1 },
      ctaConversion: { numerator: 1 },
    });
    expect(response.insights?.trend).toEqual([
      { date: '2026-01-01', started: 4, results: 1, clicks: 1 },
    ]);
    expect(response.insights?.previousPeriod).toMatchObject({ started: 0, results: 0, clicks: 0 });
    expect(response.insights?.results).toEqual([
      { resultIdentifier: 'office_core', sessions: 1, clicks: 0 },
    ]);
    expect(response.insights?.quality).toMatchObject({
      missingStepViews: 1,
      matureSessions: 4,
      openSessions: 0,
    });
    expect(
      response.insights?.stepTimings.find((row) => row.stepIdentifier === 'intro'),
    ).toMatchObject({ averageSeconds: 60 });
  });

  it('preserves zero days and enforces acquisition filtering', async () => {
    const response = await backend.getService(AnalyticsService).read({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.firstVersionIdentifier,
      source: 'nonexistent',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-03T00:00:00Z',
    });
    expect(response.insights?.trend).toEqual([
      { date: '2026-01-01', started: 0, results: 0, clicks: 0 },
      { date: '2026-01-02', started: 0, results: 0, clicks: 0 },
    ]);
    expect(response.insights?.acquisition).toEqual([]);
  });

  it('deduplicates goal sessions and separates manual and integration provenance inside the conversion window', async () => {
    const response = await backend.getService(AnalyticsService).read({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.firstVersionIdentifier,
      campaign: 'launch',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
      conversionWindowHours: '1',
    });
    expect(response.insights?.businessOutcomes).toEqual([
      { kind: 'lead', sessions: 1, manualSessions: 1, integrationSessions: 1 },
    ]);
  });

  it('uses planned random-assignment cohort for experiment evidence rather than filtered report subset', async () => {
    const response = await backend.getService(AnalyticsService).read({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.firstVersionIdentifier,
      source: 'nonexistent',
      from: '2026-02-01T00:00:00Z',
      to: '2026-02-02T00:00:00Z',
    });
    expect(response.insights?.experiments[0]).toMatchObject({
      primaryMetric: 'recommendation_open',
      cohortFrom: '2026-01-01T00:00:00.000Z',
      cohortTo: '2026-01-02T00:00:00.000Z',
      startedA: 4,
      startedB: 1,
      convertedA: 2,
      convertedB: 0,
      sampleTargetReached: false,
      plannedEndReached: true,
      followUpComplete: false,
      conversionWindowHours: null,
      trafficOrigin: 'production',
      sampleRatioMismatch: null,
    });
  });

  it('requires an explicit version for session history instead of silently truncating version scope', async () => {
    await expect(
      backend.getService(AnalyticsService).sessions({ funnelIdentifier: 'workstyle-planner' }),
    ).rejects.toThrow();
  });

  it('returns filtered session histories without event payloads or credentials', async () => {
    const response = await backend.getService(AnalyticsService).sessions({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.firstVersionIdentifier,
      sessionIdentifier: 'complete',
      stepIdentifier: 'intro',
    });
    expect(response.sessions).toHaveLength(1);
    expect(response.sessions[0]?.events.length).toBeGreaterThan(0);
    expect(Object.keys(response.sessions[0]?.events[0] ?? {}).sort()).toEqual([
      'name',
      'occurredAt',
      'source',
      'stepIdentifier',
    ]);
    expect(JSON.stringify(response)).not.toContain('must never reach timeline');
    const other = await backend.getService(AnalyticsService).sessions({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.thirdVersionIdentifier,
      sessionIdentifier: 'complete',
    });
    expect(other.sessions).toEqual([]);
  });
});
