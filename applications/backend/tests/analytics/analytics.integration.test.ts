import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { AnalyticsFixture } from '../fixtures/analytics-fixture.js';
import { AnalyticsService } from '../../source/analytics/analytics.service.js';
import { AnalyticsQueries } from '../../source/analytics/analytics-queries.js';
import { AnalyticsInputs } from '../../source/analytics/analytics-inputs.js';
import { Prisma } from '../../generated/prisma/client.js';

describe('analytics SQLite session sets', () => {
  let backend: BackendApplicationFixture;
  let versions: Awaited<ReturnType<typeof AnalyticsFixture.prepare>>;
  let cookie: string;

  beforeAll(async () => {
    backend = await AdministrationFixture.create();
    versions = await AnalyticsFixture.prepare(backend);
    cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
  });

  afterAll(async () => {
    await backend?.close();
  });

  it('requires administrator authorization and prevents caching', async () => {
    const rejected = await backend.request(
      '/api/administration/analytics?funnelIdentifier=workstyle-planner',
    );
    expect(rejected.status).toBe(401);
    expect(rejected.headers.get('cache-control')).toBe('no-store');
    const response = await backend.request(
      '/api/administration/analytics?funnelIdentifier=workstyle-planner',
      { headers: { cookie } },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await AnalyticsFixture.response(response)).versions).toHaveLength(2);
  });

  it('counts unique intersections, information Continue, pending and expired observations', async () => {
    const response = await backend.getService(AnalyticsService).read({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.firstVersion,
      campaign: 'launch',
    });
    const variant = response.versions[0]?.variants[0];
    expect(variant).toMatchObject({
      variant: 'A',
      started: 5,
      resultCompletion: { numerator: 1, denominator: 5, value: 0.2 },
      ctaConversion: { numerator: 2, denominator: 5, value: 0.4 },
      ctaClickThrough: { numerator: 1, denominator: 1, value: 1 },
    });
    expect(variant?.steps.find((step) => step.stepIdentifier === 'intro')).toEqual({
      stepIdentifier: 'intro',
      type: 'info',
      conditional: false,
      reached: 4,
      completed: 3,
      completion: { numerator: 2, denominator: 4, value: 0.5 },
      noncompletion: { open: 1, expired: 1 },
      expiredDropout: { numerator: 1, denominator: 2, value: 0.5 },
    });
    expect(variant?.steps.find((step) => step.stepIdentifier === 'result')).toEqual({
      stepIdentifier: 'result',
      type: 'result',
      conditional: false,
      reached: 1,
    });
  });

  it('retains historical branches, excludes Back and repeated transitions, and separates destination loss', async () => {
    const response = await backend.getService(AnalyticsService).read({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.firstVersion,
      campaign: 'launch',
    });
    const edges = response.versions[0]?.variants[0]?.edges;
    expect(
      edges?.find(
        (edge) =>
          edge.fromStepIdentifier === 'work_mode' && edge.toStepIdentifier === 'timezone_span',
      ),
    ).toEqual({
      fromStepIdentifier: 'work_mode',
      toStepIdentifier: 'timezone_span',
      transitions: 2,
      observedConversion: { numerator: 1, denominator: 2, value: 0.5 },
      branchShare: { numerator: 2, denominator: 2, value: 1 },
      transitionToView: { numerator: 1, denominator: 2, value: 0.5 },
      destinationNonreach: { open: 0, expired: 1 },
    });
    expect(edges?.find((edge) => edge.toStepIdentifier === 'office_days')).toMatchObject({
      transitions: 1,
      branchShare: { numerator: 1, denominator: 2, value: 0.5 },
    });
    expect(edges?.some((edge) => edge.fromStepIdentifier === 'timezone_span')).toBe(false);
  });

  it('includes zero-traffic variants and not-applicable ratios in configuration order', async () => {
    const response = await backend.getService(AnalyticsService).read({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.firstVersion,
      campaign: 'launch',
    });
    expect(response.versions[0]?.variants[1]).toMatchObject({
      variant: 'B',
      started: 0,
      resultCompletion: { numerator: 0, denominator: 0, value: null },
      ctaClickThrough: { numerator: 0, denominator: 0, value: null },
    });
    expect(response.versions[0]?.variants[0]?.steps.map((step) => step.stepIdentifier)).toEqual([
      'intro',
      'team_size',
      'work_mode',
      'priorities',
      'timezone_span',
      'office_days',
      'async_maturity',
      'tool_count',
      'result',
    ]);
  });

  it('applies campaign, forced-assignment and synthetic filters consistently', async () => {
    const service = backend.getService(AnalyticsService);
    const base = {
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: versions.firstVersion,
    };
    expect(
      (await service.read({ ...base, includeForced: 'true' })).versions[0]?.variants[0]?.started,
    ).toBe(6);
    expect(
      (await service.read({ ...base, trafficOrigin: 'synthetic' })).versions[0]?.variants[0]
        ?.started,
    ).toBe(1);
    expect(
      (await service.read({ ...base, trafficOrigin: 'all', includeForced: 'true' })).versions[0]
        ?.variants[0]?.started,
    ).toBe(7);
    expect(
      (await service.read({ ...base, campaign: 'other' })).versions[0]?.variants.map(
        (variant) => variant.started,
      ),
    ).toEqual([0, 1]);
  });

  it('paginates versions without pooling variants or experiments', async () => {
    const service = backend.getService(AnalyticsService);
    const firstPage = await service.read({ funnelIdentifier: 'workstyle-planner', limit: '1' });
    expect(firstPage.versions[0]).toMatchObject({
      versionIdentifier: versions.thirdVersion,
      funnelVersion: 3,
    });
    expect(firstPage.versions[0]?.variants.map((variant) => variant.started)).toEqual([0, 1]);
    expect(
      firstPage.versions[0]?.variants[1]?.steps.some(
        (step) => step.stepIdentifier === 'tool_count',
      ),
    ).toBe(false);
    expect(
      (await service.read({ funnelIdentifier: 'workstyle-planner', limit: '1', offset: '1' }))
        .versions[0]?.versionIdentifier,
    ).toBe(versions.firstVersion);
    expect((await service.read({ funnelIdentifier: 'missing' })).versions).toEqual([]);
  });

  it('uses session and event indexes in the aggregate query plan', async () => {
    const query = AnalyticsInputs.query({ funnelIdentifier: 'workstyle-planner' });
    const cohort = AnalyticsQueries.cohort(query, [versions.firstVersion], new Date());
    const plan = await backend.database.$queryRaw<unknown[]>(
      Prisma.sql`EXPLAIN QUERY PLAN ${AnalyticsQueries.steps(cohort)}`,
    );
    expect(AnalyticsFixture.queryPlan(plan)).toContain(
      'Event_sessionIdentifier_name_stepIdentifier_idx',
    );
    expect(AnalyticsFixture.queryPlan(plan)).toContain(
      'SessionTransition_sessionIdentifier_fromStepIdentifier_kind_idx',
    );
  });
});
