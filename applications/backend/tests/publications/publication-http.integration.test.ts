import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdministrationFixture } from '../fixtures/administration.js';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { ConfigurationImportFixtures } from '../fixtures/configuration-import-fixtures.js';
import { PublicationFixtures } from '../fixtures/publication-fixtures.js';
import { PublicationHttpFixtures } from '../fixtures/publication-http-fixtures.js';
import { PublicationCases } from '../cases/publication-cases.js';

describe('protected version management HTTP', () => {
  let backend: BackendApplicationFixture;
  beforeEach(async () => {
    backend = await AdministrationFixture.create();
  });
  afterEach(async () => {
    await backend?.close();
  });

  it.each(PublicationCases.ProtectedRoutes)(
    'requires authorization for $method $route',
    async ({ method, route }) => {
      const response = await backend.request(`/api/administration/${route}`, {
        method,
        headers: AdministrationFixture.Headers,
        ...(method === 'POST' ? { body: '{}' } : {}),
      });
      expect(response.status).toBe(401);
      expect(await backend.database.publication.count()).toBe(0);
    },
  );

  it('imports all supplied versions, activates, rolls back and authorizes before replay', async () => {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
    const firstDocument = ConfigurationImportFixtures.original();
    for (const version of PublicationCases.SuppliedVersions) {
      const response = await PublicationHttpFixtures.post(
        backend,
        'configurations',
        cookie,
        ConfigurationImportFixtures.original(version),
      );
      expect(response.status).toBe(201);
    }

    const first = await backend.database.funnelVersion.findFirstOrThrow({ where: { version: 1 } });
    const third = await backend.database.funnelVersion.findFirstOrThrow({ where: { version: 3 } });
    const initial = PublicationFixtures.request(first.funnelIdentifier, first.identifier);
    const published = await PublicationHttpFixtures.post(backend, 'publications', cookie, initial);
    expect(published.status).toBe(201);
    const originalResponse: unknown = await published.json();
    const forbiddenReplay = await backend.request('/api/administration/publications', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(initial),
    });
    expect(forbiddenReplay.status).toBe(403);

    expect(
      (
        await PublicationHttpFixtures.post(
          backend,
          'publications',
          cookie,
          PublicationFixtures.request(first.funnelIdentifier, third.identifier, 1),
        )
      ).status,
    ).toBe(201);
    const rollback = await PublicationHttpFixtures.post(backend, 'rollbacks', cookie, {
      operationIdentifier: randomUUID(),
      funnelIdentifier: first.funnelIdentifier,
      expectedRevision: 2,
    });
    expect(rollback.status).toBe(201);
    expect(await rollback.json()).toMatchObject({
      targetVersionIdentifier: first.identifier,
      revision: 3,
    });
    const repeated = await PublicationHttpFixtures.post(backend, 'publications', cookie, initial);
    expect(repeated.status).toBe(201);
    expect(await repeated.json()).toEqual(originalResponse);
    const configurations = await backend.request(
      `/api/administration/configurations?funnelIdentifier=${firstDocument.funnelId}&limit=2`,
      { headers: { cookie } },
    );
    expect(configurations.status).toBe(200);
    expect(await configurations.json()).toMatchObject({
      funnel: { activeVersionIdentifier: first.identifier, revision: 3 },
      items: [{ version: 3 }, { version: 2 }],
      nextOffset: 2,
    });
    const history = await backend.request(
      `/api/administration/publications?funnelIdentifier=${firstDocument.funnelId}`,
      { headers: { cookie } },
    );
    expect(history.status).toBe(200);
    expect(await history.json()).toMatchObject({
      items: [{ revision: 3 }, { revision: 2 }, { revision: 1 }],
    });
    await backend.database.administratorSession.updateMany({ data: { revokedAt: new Date() } });
    expect(
      (await PublicationHttpFixtures.post(backend, 'publications', cookie, initial)).status,
    ).toBe(401);
    expect(await backend.database.publication.count()).toBe(3);
  });

  it('rejects CSRF, unknown queries and invalid documents with bounded diagnostics', async () => {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
    const forbidden = await backend.request('/api/administration/configurations', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(ConfigurationImportFixtures.original()),
    });
    expect(forbidden.status).toBe(403);
    const invalid = await PublicationHttpFixtures.post(backend, 'configurations', cookie, {});
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({
      code: 'invalid',
      issues: expect.any(Array),
      requestIdentifier: expect.any(String),
    });
    const query = await backend.request(
      '/api/administration/configurations?funnelIdentifier=test&unexpected=true',
      { headers: { cookie } },
    );
    expect(query.status).toBe(400);
    expect(await backend.database.funnelVersion.count()).toBe(0);
  });
});
