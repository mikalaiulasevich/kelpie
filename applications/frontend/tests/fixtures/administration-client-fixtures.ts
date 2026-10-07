import assert from 'node:assert/strict';
import { vi, type Mock } from 'vitest';
import { ServiceReadinessFixture } from './service-readiness-fixtures';

export const AdministrationClientFixture = {
  browser: ServiceReadinessFixture.browser,
  stalledResponse: ServiceReadinessFixture.stalledResponse,
  stalledBody: ServiceReadinessFixture.stalledBody,
  networkFailure: ServiceReadinessFixture.networkFailure,
  malformedResponse: ServiceReadinessFixture.malformedResponse,

  identity() {
    return { identifier: 'administrator-1', username: 'administrator' };
  },

  credentials() {
    return { username: 'administrator', password: 'a-secret-test-password' };
  },

  response(body: unknown, status = 200): Mock<typeof globalThis.fetch> {
    return ServiceReadinessFixture.response(body, status);
  },

  signInResponse(body: unknown) {
    const requestBodies: Promise<unknown>[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      assert.ok(input instanceof Request);
      requestBodies.push(input.clone().json());

      return Response.json(body);
    });
    vi.stubGlobal('fetch', fetch);

    return { fetch, requestBodies };
  },

  signedOut(): Mock<typeof globalThis.fetch> {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);

    return fetch;
  },
} as const;
