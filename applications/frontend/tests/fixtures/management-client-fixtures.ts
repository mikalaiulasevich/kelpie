import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FunnelConfigurations } from '@kelpie/contracts';
import { vi } from 'vitest';
import { ServiceReadinessFixture } from './service-readiness-fixtures';

export const ManagementClientFixture = {
  browser: ServiceReadinessFixture.browser,
  response: ServiceReadinessFixture.response,
  networkFailure: ServiceReadinessFixture.networkFailure,
  stalledResponse: ServiceReadinessFixture.stalledResponse,
  stalledBody: ServiceReadinessFixture.stalledBody,

  query() {
    return { funnelIdentifier: 'wellness', limit: 25, offset: 0 };
  },

  command() {
    return {
      funnelIdentifier: 'wellness',
      operationIdentifier: '12345678-1234-1234-1234-123456789012',
      targetVersionIdentifier: '22345678-1234-1234-1234-123456789012',
      expectedRevision: 2,
    };
  },

  mutationResponse(body: unknown) {
    const requestBodies: Promise<unknown>[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      assert.ok(input instanceof Request);
      requestBodies.push(input.clone().json());

      return Response.json(body);
    });
    vi.stubGlobal('fetch', fetch);

    return { fetch, requestBodies };
  },

  version() {
    return {
      identifier: '22345678-1234-1234-1234-123456789012',
      funnelIdentifier: 'wellness',
      version: 3,
      schemaVersion: '1',
      checksum: 'safe-checksum',
    };
  },

  configurationDocument() {
    const document: unknown = JSON.parse(
      readFileSync(new URL('../../../../configurations/funnel-v3.json', import.meta.url), 'utf8'),
    );
    const result = FunnelConfigurations.validate(document);
    assert.ok(result.valid);

    return {
      version: {
        identifier: '22345678-1234-1234-1234-123456789012',
        funnelIdentifier: 'workstyle-planner',
        version: 3,
        schemaVersion: '1.0',
        checksum: 'safe-checksum',
      },
      document: result.configuration,
    };
  },

  configurations() {
    return {
      funnel: { identifier: 'wellness', activeVersionIdentifier: null, revision: 2 },
      items: [ManagementClientFixture.version()],
      nextOffset: null,
    };
  },

  publication() {
    return {
      identifier: 'publication-1',
      operationIdentifier: '12345678-1234-1234-1234-123456789012',
      action: 'publish',
      administratorIdentifier: 'administrator-1',
      funnelIdentifier: 'wellness',
      targetVersionIdentifier: '22345678-1234-1234-1234-123456789012',
      previousVersionIdentifier: null,
      revision: 3,
      createdAt: '2026-10-07T00:00:00Z',
    };
  },

  analytics() {
    const ratio = { numerator: 0, denominator: 0, value: null };

    return {
      generatedAt: '2026-10-07T00:00:00Z',
      filters: {
        funnelIdentifier: 'wellness',
        includeForced: false,
        trafficOrigin: 'production',
        limit: 10,
        offset: 0,
      },
      pagination: { limit: 10, offset: 0, hasMore: false },
      versions: [
        {
          versionIdentifier: 'version-1',
          funnelVersion: 3,
          experimentIdentifier: 'experiment-1',
          variants: [
            {
              variant: 'A',
              started: 0,
              resultCompletion: ratio,
              ctaConversion: ratio,
              ctaClickThrough: ratio,
              steps: [
                {
                  stepIdentifier: 'welcome',
                  conditional: false,
                  reached: 0,
                  type: 'info',
                  completed: 0,
                  completion: ratio,
                  noncompletion: { open: 0, expired: 0 },
                  expiredDropout: ratio,
                },
                { stepIdentifier: 'result', conditional: true, reached: 0, type: 'result' },
              ],
              edges: [
                {
                  fromStepIdentifier: 'welcome',
                  toStepIdentifier: 'result',
                  transitions: 0,
                  observedConversion: ratio,
                  branchShare: ratio,
                  transitionToView: ratio,
                  destinationNonreach: { open: 0, expired: 0 },
                },
              ],
            },
          ],
        },
      ],
    };
  },
} as const;
