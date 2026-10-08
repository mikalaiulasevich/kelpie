import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdministrationFixture } from '../fixtures/administration.js';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { ConfigurationLibraryFixture } from '../fixtures/configuration-library-fixture.js';
import { ConfigurationImportFixtures } from '../fixtures/configuration-import-fixtures.js';
import { PublicationHttpFixtures } from '../fixtures/publication-http-fixtures.js';

describe('version library and isolated previews', () => {
  let backend: BackendApplicationFixture;
  beforeEach(async () => {
    backend = await AdministrationFixture.create();
  });
  afterEach(async () => {
    await backend?.close();
  });

  it('searches before pagination and returns actual import provenance', async () => {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));

    for (const version of [1, 2, 3]) {
      await PublicationHttpFixtures.post(
        backend,
        'configurations',
        cookie,
        ConfigurationImportFixtures.original(version),
      );
    }

    const response = await backend.request(
      '/api/administration/configurations?funnelIdentifier=workstyle-planner&search=1&sort=version-asc&limit=1',
      { headers: { cookie } },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      items: [{ version: 1, importedBy: expect.any(String), importedAt: expect.any(String) }],
      total: 3,
      nextOffset: 1,
    });
    const escaped = await backend.request(
      '/api/administration/configurations?funnelIdentifier=workstyle-planner&search=%25',
      { headers: { cookie } },
    );
    expect(escaped.status).toBe(200);
    expect(await escaped.json()).toMatchObject({ total: 0, items: [] });
  });

  it('finds the oldest matching version beyond the first 100 through the HTTP library search', async () => {
    await ConfigurationLibraryFixture.beyondFirstPage(backend);
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
    const firstPage = await backend.request(
      '/api/administration/configurations?funnelIdentifier=workstyle-planner&limit=100&offset=0',
      { headers: { cookie } },
    );
    expect(firstPage.status).toBe(200);
    const firstPageBody = await firstPage.json();
    expect(firstPageBody).toMatchObject({ total: 101, nextOffset: 100 });
    expect(firstPageBody.items).toHaveLength(100);
    expect(firstPageBody.items).not.toContainEqual(expect.objectContaining({ version: 1 }));

    const searchedPage = await backend.request(
      '/api/administration/configurations?funnelIdentifier=workstyle-planner&search=Historical%20launch%20research&limit=100&offset=0',
      { headers: { cookie } },
    );
    expect(searchedPage.status).toBe(200);
    expect(await searchedPage.json()).toMatchObject({
      total: 1,
      nextOffset: null,
      items: [{ version: 1, description: 'Historical launch research' }],
    });
  });

  it('creates a synthetic exact variant using a separate admin-protected cookie', async () => {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
    const imported = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(3),
    );
    const response = await PublicationHttpFixtures.post(
      backend,
      `configurations/${imported.version.identifier}/preview`,
      cookie,
      {
        operationIdentifier: randomUUID(),
        clientTimestamp: new Date().toISOString(),
        variant: 'B',
      },
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toMatch(/^kelpie_preview=/);
    expect(await response.json()).toMatchObject({
      versionIdentifier: imported.version.identifier,
      variant: 'B',
    });
    const session = await backend.database.session.findFirstOrThrow();
    expect(session.trafficOrigin).toBe('synthetic');
    const previewCookie = response.headers.get('set-cookie')?.split(';')[0] ?? '';
    const forbidden = await backend.request('/api/sessions/current', {
      headers: { cookie: previewCookie, 'x-kelpie-preview': '1' },
    });
    expect(forbidden.status).toBe(401);
    const allowed = await backend.request('/api/sessions/current', {
      headers: { cookie: `${cookie}; ${previewCookie}`, 'x-kelpie-preview': '1' },
    });
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({
      state: { versionIdentifier: imported.version.identifier, variant: 'B' },
    });
    const normal = await backend.request('/api/sessions/current', {
      headers: { cookie: `${cookie}; ${previewCookie}` },
    });
    expect(await normal.json()).toMatchObject({ state: null });
  });
});
