import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { AnalyticsAcquisitionFixture } from '../fixtures/analytics-acquisition-fixture.js';
import { AnalyticsService } from '../../source/analytics/analytics.service.js';

describe('unrecorded acquisition filters', () => {
  let backend: BackendApplicationFixture;
  let versionIdentifier: string;

  beforeAll(async () => {
    backend = await AdministrationFixture.create();
    versionIdentifier = await AnalyticsAcquisitionFixture.prepare(backend);
  });

  afterAll(async () => {
    await backend?.close();
  });

  it('matches both null and empty campaigns consistently with acquisition options', async () => {
    const service = backend.getService(AnalyticsService);
    const query = { funnelIdentifier: 'workstyle-planner', versionIdentifier };
    const unfiltered = await service.read(query);
    expect(unfiltered.versions[0]?.variants[0]?.started).toBe(3);
    expect(unfiltered.insights?.acquisitionOptions.campaigns).toEqual([
      { value: '', sessions: 2 },
      { value: 'recorded', sessions: 1 },
    ]);

    const unrecorded = await service.read({ ...query, campaign: '', source: '', medium: '' });
    expect(unrecorded.versions[0]?.variants[0]?.started).toBe(2);
    expect(unrecorded.insights?.acquisition).toEqual([
      { source: '', medium: '', campaign: '', started: 2, results: 0, clicks: 0 },
    ]);
    const sessions = await service.sessions({ ...query, campaign: '' });
    expect(sessions.sessions.map((session) => session.sessionIdentifier).sort()).toEqual([
      'acquisition-',
      'acquisition-null',
    ]);

    const recorded = await service.read({ ...query, campaign: 'recorded' });
    expect(recorded.versions[0]?.variants[0]?.started).toBe(1);
    expect(recorded.insights?.acquisition[0]?.campaign).toBe('recorded');
  });
});
