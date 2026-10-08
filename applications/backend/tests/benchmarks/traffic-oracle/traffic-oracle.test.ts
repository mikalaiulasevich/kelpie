import { describe, expect, it } from 'vitest';
import { TrafficOracle } from './traffic-oracle.js';
import { TrafficOracleFixture } from '../../fixtures/traffic-oracle/traffic-oracle-fixture.js';

describe('independent synthetic traffic oracle', () => {
  it('counts sessions rather than repeated observations or repeated forwards', () => {
    const manifest = TrafficOracleFixture.manifest();
    TrafficOracle.validate(manifest);
    expect(TrafficOracle.summary(manifest)).toEqual({
      started: 3,
      resultCompletion: { numerator: 1, denominator: 3, value: 1 / 3 },
      ctaConversion: { numerator: 2, denominator: 3, value: 2 / 3 },
      ctaClickThrough: { numerator: 1, denominator: 1, value: 1 },
    });
    expect(TrafficOracle.step(manifest, 'intro')).toEqual({
      reached: 2,
      completed: 2,
      completion: { numerator: 1, denominator: 2, value: 0.5 },
      noncompletion: { open: 0, expired: 1 },
      expiredDropout: { numerator: 1, denominator: 1, value: 1 },
    });
  });

  it('keeps an open uncompleted step distinct from an expired one', () => {
    const session = TrafficOracleFixture.session({ submittedSteps: [], expired: false });
    expect(TrafficOracle.step([session], 'intro')).toEqual({
      reached: 1,
      completed: 0,
      completion: { numerator: 0, denominator: 1, value: 0 },
      noncompletion: { open: 1, expired: 0 },
      expiredDropout: { numerator: 0, denominator: 0, value: null },
    });
  });

  it('selects acquisition, version, variant and forced assignment independently', () => {
    const selected = TrafficOracleFixture.session();
    const forced = TrafficOracleFixture.session({ sessionIdentifier: 'forced', forced: true });
    const other = TrafficOracleFixture.session({ sessionIdentifier: 'other', variant: 'B' });
    expect(
      TrafficOracle.select([selected, forced, other], {
        includeForced: false,
        variant: 'A',
        versionIdentifier: 'version-one',
        source: 'search',
        medium: 'paid',
        campaign: 'launch',
      }),
    ).toEqual([selected]);
    expect(TrafficOracle.select([selected], { includeForced: true, campaign: 'missing' })).toEqual(
      [],
    );
  });

  it('rejects duplicate identities and invalid metrics in the manifest', () => {
    const session = TrafficOracleFixture.session();
    expect(() => TrafficOracle.validate([session, session])).toThrow();
    expect(() => TrafficOracle.validate([{ ...session, replayedEvents: -1 }])).toThrow();
    expect(() => TrafficOracle.validate([{ ...session, variant: 'C' }])).toThrow();
    expect(() =>
      TrafficOracle.validate([
        { ...session, acquisition: { ...session.acquisition, unknown: true } },
      ]),
    ).toThrow();
  });

  it('accepts hand-calculated analytics and rejects corrupted backend counts', () => {
    const manifest = TrafficOracleFixture.manifest();
    const response = TrafficOracleFixture.response();
    expect(() => TrafficOracle.verify(manifest, response, { includeForced: true })).not.toThrow();
    const corrupted = {
      ...response,
      versions: response.versions.map((version) => ({
        ...version,
        variants: version.variants.map((variant) => ({ ...variant, started: 4 })),
      })),
    };
    expect(() => TrafficOracle.verify(manifest, corrupted, { includeForced: true })).toThrow();
  });

  it('rejects omitted manifest groups and incomplete pagination', () => {
    const manifest = TrafficOracleFixture.manifest();
    const response = TrafficOracleFixture.response();
    expect(() =>
      TrafficOracle.verify(manifest, { ...response, versions: [] }, { includeForced: true }),
    ).toThrow();
    expect(() =>
      TrafficOracle.verify(
        manifest,
        { ...response, pagination: { ...response.pagination, hasMore: true } },
        { includeForced: true },
      ),
    ).toThrow();
  });

  it('rejects an analytics scope that silently changes traffic origin or campaign', () => {
    const manifest = TrafficOracleFixture.manifest();
    const response = TrafficOracleFixture.response();
    expect(() =>
      TrafficOracle.verify(
        manifest,
        { ...response, filters: { ...response.filters, trafficOrigin: 'production' } },
        { includeForced: true },
      ),
    ).toThrow();
    expect(() =>
      TrafficOracle.verify(manifest, response, { includeForced: true, campaign: 'launch' }),
    ).toThrow();
  });

  it('reports actual coverage without claiming unseen outcomes or branches', () => {
    expect(TrafficOracle.coverage(TrafficOracleFixture.manifest())).toEqual({
      sessions: 3,
      completed: 2,
      incomplete: 1,
      forced: 0,
      random: 3,
      missingStepViews: 1,
      replayedEvents: 3,
      rejectedEvents: 3,
      backChanges: 0,
      groups: [
        {
          group: '1:A',
          started: 3,
          completed: 2,
          incomplete: 1,
          results: ['remote'],
          submittedSteps: ['intro'],
          campaigns: ['launch'],
          recommendationClicked: 2,
        },
      ],
    });
  });

  it('keeps empty cohort rates not applicable', () => {
    expect(TrafficOracle.summary([])).toEqual({
      started: 0,
      resultCompletion: { numerator: 0, denominator: 0, value: null },
      ctaConversion: { numerator: 0, denominator: 0, value: null },
      ctaClickThrough: { numerator: 0, denominator: 0, value: null },
    });
  });
});
