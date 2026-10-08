import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { AnalyticsMaturityFixture } from '../fixtures/analytics-maturity-fixture.js';

describe('conversion maturity independent of navigation expiry', () => {
  let backend: BackendApplicationFixture;
  let versionIdentifier: string;

  beforeAll(async () => {
    backend = await AdministrationFixture.create();
    versionIdentifier = await AnalyticsMaturityFixture.prepare(backend);
  });

  afterAll(async () => {
    await backend?.close();
  });

  it('keeps an expired navigation session immature while business outcomes can still arrive', async () => {
    const beforeOutcome = await AnalyticsMaturityFixture.read(
      backend,
      versionIdentifier,
      '2026-01-03T00:00:00Z',
      '168',
    );
    expect(beforeOutcome.insights.quality).toMatchObject({ openSessions: 1, matureSessions: 0 });
    expect(beforeOutcome.insights.businessOutcomes).toEqual([]);
    expect(beforeOutcome.steps[0]).toMatchObject({
      stepIdentifier: 'intro',
      expiredNoncompletion: 1,
      openNoncompletion: 0,
    });

    const afterOutcome = await AnalyticsMaturityFixture.read(
      backend,
      versionIdentifier,
      '2026-01-04T00:00:00Z',
      '168',
    );
    expect(afterOutcome.insights.quality).toMatchObject({ openSessions: 1, matureSessions: 0 });
    expect(afterOutcome.insights.businessOutcomes).toEqual([
      { kind: 'lead', sessions: 1, manualSessions: 0, integrationSessions: 1 },
    ]);
  });

  it('matures exactly at the conversion deadline and retains eligible outcomes', async () => {
    const beforeDeadline = await AnalyticsMaturityFixture.read(
      backend,
      versionIdentifier,
      '2026-01-07T23:59:59.999Z',
      '168',
    );
    expect(beforeDeadline.insights.quality).toMatchObject({ openSessions: 1, matureSessions: 0 });
    const atDeadline = await AnalyticsMaturityFixture.read(
      backend,
      versionIdentifier,
      '2026-01-08T00:00:00Z',
      '168',
    );
    expect(atDeadline.insights.quality).toMatchObject({ openSessions: 0, matureSessions: 1 });
    expect(atDeadline.insights.businessOutcomes).toEqual([
      { kind: 'lead', sessions: 1, manualSessions: 0, integrationSessions: 1 },
    ]);
  });

  it('does not claim maturity when no finite conversion window is selected', async () => {
    const response = await AnalyticsMaturityFixture.read(
      backend,
      versionIdentifier,
      '2026-01-08T00:00:00Z',
    );
    expect(response.insights.quality).toMatchObject({ openSessions: 1, matureSessions: 0 });
    expect(response.steps[0]).toMatchObject({ expiredNoncompletion: 1, openNoncompletion: 0 });
  });
});
