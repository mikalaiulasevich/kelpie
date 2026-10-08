import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { AnalyticsInsightFixture } from '../fixtures/analytics-insight-fixture.js';
import { AnalyticsReadBatchFixture } from '../fixtures/analytics-read-batch-fixture.js';
import { AnalyticsService } from '../../source/analytics/analytics.service.js';

describe('analytics snapshot batch', () => {
  let backend: BackendApplicationFixture;

  beforeAll(async () => {
    backend = await AdministrationFixture.create();
    await AnalyticsInsightFixture.prepare(backend);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await backend?.close();
  });

  it('batches aggregates, previous period, acquisition facets and experiment counts once', async () => {
    const observed = AnalyticsReadBatchFixture.observe(backend);
    const response = await backend.getService(AnalyticsService).read({
      funnelIdentifier: 'workstyle-planner',
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-03T00:00:00Z',
    });

    expect(observed.statementCounts).toEqual([6]);
    const sharedStatement = observed.statements[0]?.[0];
    expect(sharedStatement?.match(/\bcohort AS MATERIALIZED/g)).toHaveLength(1);
    expect(sharedStatement).toContain("'summaries'");
    expect(sharedStatement).toContain("'stepTimings'");
    expect(response.insights?.previousPeriod).toMatchObject({
      from: '2025-12-30T00:00:00.000Z',
      to: '2026-01-01T00:00:00.000Z',
    });
    expect(response.insights?.experiments).toHaveLength(1);
    expect(response.insights?.acquisitionOptions.campaigns.length).toBeGreaterThan(0);
  });

  it('does not submit aggregate queries for an empty version page', async () => {
    const observed = AnalyticsReadBatchFixture.observe(backend);
    const response = await backend
      .getService(AnalyticsService)
      .read({ funnelIdentifier: 'missing' });

    expect(response.versions).toEqual([]);
    expect(observed.statementCounts).toEqual([]);
  });

  it('rejects truncated result batches and can read again after failed projection', async () => {
    const observed = AnalyticsReadBatchFixture.observe(backend, (rows) => rows.slice(0, -1));
    const service = backend.getService(AnalyticsService);

    await expect(service.read({ funnelIdentifier: 'workstyle-planner' })).rejects.toThrow(
      'Analytics aggregate batch is invalid.',
    );
    observed.spy.mockRestore();
    const response = await service.read({ funnelIdentifier: 'workstyle-planner' });
    expect(response.versions.length).toBeGreaterThan(0);
  });

  it('retains row schema validation after batching', async () => {
    AnalyticsReadBatchFixture.observe(backend, (rows) =>
      rows.map((result, index) => (index === 0 ? [{}] : result)),
    );

    await expect(
      backend.getService(AnalyticsService).read({ funnelIdentifier: 'workstyle-planner' }),
    ).rejects.toThrow('Analytics aggregate is invalid.');
  });
});
