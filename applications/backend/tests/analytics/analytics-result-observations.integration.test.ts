import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdministrationFixture } from '../fixtures/administration.js';
import { AnalyticsFixture } from '../fixtures/analytics-fixture.js';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { AnalyticsService } from '../../source/analytics/analytics.service.js';

describe('result observation aggregation', () => {
  let backend: BackendApplicationFixture;
  let versionIdentifier: string;

  beforeAll(async () => {
    backend = await AdministrationFixture.create();
    versionIdentifier = (await AnalyticsFixture.prepare(backend)).firstVersionIdentifier;
    await backend.database.event.createMany({
      data: [
        { name: 'result_viewed', result: 'office_core' },
        { name: 'result_viewed', result: 'office_core' },
        { name: 'cta_clicked', result: 'office_core' },
        { name: 'cta_clicked', result: 'office_core' },
        { name: 'cta_clicked', result: 'unviewed_result' },
        { name: 'result_viewed', result: 'remote_core' },
      ].map((observation) => ({
        identifier: randomUUID(),
        sessionIdentifier: 'complete',
        contentFingerprint: randomUUID(),
        source: 'client',
        name: observation.name,
        stepIdentifier: 'result',
        clientTimestamp: new Date(),
        properties: { result_id: observation.result },
      })),
    });
  });

  afterAll(async () => {
    await backend?.close();
  });

  it('counts each session once per viewed result and only matches clicks for that result', async () => {
    const response = await backend.getService(AnalyticsService).read({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier,
    });
    expect(response.insights?.results).toEqual([
      { resultIdentifier: 'office_core', sessions: 1, clicks: 1 },
      { resultIdentifier: 'remote_core', sessions: 1, clicks: 0 },
    ]);
    expect(response.versions[0]?.variants[0]?.resultCompletion.numerator).toBe(1);
  });
});
