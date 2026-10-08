import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdministrationFixture } from '../fixtures/administration.js';
import { AnalyticsFixture } from '../fixtures/analytics-fixture.js';
import { ConfigurationImportFixtures } from '../fixtures/configuration-import-fixtures.js';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';

describe('authenticated business evidence and experiment registration', () => {
  let backend: BackendApplicationFixture;
  let cookie: string;
  let versionIdentifier: string;
  const sessionIdentifier = randomUUID();

  beforeAll(async () => {
    backend = await AdministrationFixture.create();
    cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
    const imported = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(3),
    );
    versionIdentifier = imported.version.identifier;
    await AnalyticsFixture.session(backend, { sessionIdentifier, versionIdentifier });
  });

  afterAll(async () => {
    await backend?.close();
  });

  it('requires authentication and CSRF protection to record business outcomes', async () => {
    const unauthorized = await backend.request('/api/administration/business-outcomes');
    expect(unauthorized.status).toBe(401);
    const forbidden = await backend.request('/api/administration/business-outcomes', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: '{}',
    });
    expect(forbidden.status).toBe(403);
  });

  it('replays an outcome once and rejects conflicting external identifiers', async () => {
    const document = {
      sessionIdentifier,
      externalIdentifier: randomUUID(),
      source: 'fixture-crm',
      provenance: 'integration',
      kind: 'lead',
      occurredAt: new Date().toISOString(),
    };
    const options = {
      method: 'POST',
      headers: { ...AdministrationFixture.Headers, cookie },
      body: JSON.stringify(document),
    };
    const first = await backend.request('/api/administration/business-outcomes', options);
    expect(first.status).toBe(200);
    const replay = await backend.request('/api/administration/business-outcomes', options);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(await first.json());
    const conflict = await backend.request('/api/administration/business-outcomes', {
      ...options,
      body: JSON.stringify({ ...document, kind: 'purchase' }),
    });
    expect(conflict.status).toBe(409);
    const overview = await backend.request(
      '/api/administration/business-outcomes/overview?funnelIdentifier=workstyle-planner',
      { headers: { cookie } },
    );
    expect(await overview.json()).toEqual({
      connectorConfigured: false,
      counts: [{ kind: 'lead', provenance: 'integration', count: 1 }],
    });
  });

  it('rejects impossible timestamps and non-existing sessions', async () => {
    const document = {
      sessionIdentifier,
      externalIdentifier: randomUUID(),
      source: 'manual',
      provenance: 'manual',
      kind: 'purchase',
      occurredAt: '2000-01-01T00:00:00.000Z',
    };
    const options = { method: 'POST', headers: { ...AdministrationFixture.Headers, cookie } };
    expect(
      (
        await backend.request('/api/administration/business-outcomes', {
          ...options,
          body: JSON.stringify(document),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await backend.request('/api/administration/business-outcomes', {
          ...options,
          body: JSON.stringify({
            ...document,
            sessionIdentifier: randomUUID(),
            occurredAt: new Date().toISOString(),
          }),
        })
      ).status,
    ).toBe(404);
  });

  it('records immutable plans, returns configured allocation, and safely replays retries', async () => {
    const path = `/api/administration/experiment-plans/${versionIdentifier}`;
    const initial = await backend.request(path, { headers: { cookie } });
    expect(await initial.json()).toMatchObject({ plan: null, expectedAllocationA: 0.5 });
    const document = {
      hypothesis: 'Shorter questions increase confirmed leads.',
      primaryMetric: 'lead',
      targetSamplePerVariant: 1000,
      plannedEndAt: '2099-01-01T00:00:00.000Z',
    };
    const options = {
      method: 'POST',
      headers: { ...AdministrationFixture.Headers, cookie },
      body: JSON.stringify(document),
    };
    const saved = await backend.request(path, options);
    expect(saved.status).toBe(201);
    const replay = await backend.request(path, options);
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(await saved.json());
    const conflict = await backend.request(path, {
      ...options,
      body: JSON.stringify({ ...document, targetSamplePerVariant: 1500 }),
    });
    expect(conflict.status).toBe(409);
    const read = await backend.request(path, { headers: { cookie } });
    expect(await read.json()).toMatchObject({ plan: document, expectedAllocationA: 0.5 });
  });
});
