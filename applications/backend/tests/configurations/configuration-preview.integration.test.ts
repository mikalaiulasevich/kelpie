import { randomUUID } from 'node:crypto';
import { ConfigurationPreviewFixture } from '../fixtures/configuration-preview-fixture.js';
import { AnalyticsService } from '../../source/analytics/analytics.service.js';
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
    expect(firstPageBody).toHaveProperty('items.length', 100);
    expect(firstPageBody).not.toMatchObject({
      items: expect.arrayContaining([expect.objectContaining({ version: 1 })]),
    });

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
  it('creates random synthetic traffic with acquisition and excludes it from production analytics', async () => {
    const preview = await ConfigurationPreviewFixture.prepare(backend);
    const response = await preview.post(preview.body);
    expect(response.status).toBe(201);
    const original = await response.json();
    const session = await backend.database.session.findFirstOrThrow();
    expect(session).toMatchObject({
      trafficOrigin: 'synthetic',
      assignmentSource: 'random',
      campaign: 'isolated-run',
      acquisitionParameters: { utm_source: 'load-test', utm_campaign: 'isolated-run' },
    });
    expect(['A', 'B']).toContain(session.variant);

    const replay = await preview.post({
      ...preview.body,
      acquisition: { utm_campaign: 'isolated-run', utm_source: 'load-test' },
    });
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(original);
    expect(await backend.database.session.count()).toBe(1);
    const analytics = backend.getService(AnalyticsService);
    const query = {
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: preview.versionIdentifier,
    };
    const production = await analytics.read(query);
    expect(
      production.versions
        .flatMap((version) => version.variants)
        .reduce((sum, variant) => sum + variant.started, 0),
    ).toBe(0);
    const synthetic = await analytics.read({
      ...query,
      trafficOrigin: 'synthetic',
      campaign: 'isolated-run',
    });
    expect(
      synthetic.versions
        .flatMap((version) => version.variants)
        .reduce((sum, variant) => sum + variant.started, 0),
    ).toBe(1);
  });

  it('rejects changed acquisition or assignment on replay without changing the stored session', async () => {
    const preview = await ConfigurationPreviewFixture.prepare(backend);
    expect((await preview.post(preview.body)).status).toBe(201);
    const original = await backend.database.session.findFirstOrThrow();
    expect(
      (await preview.post({ ...preview.body, acquisition: { utm_campaign: 'different-run' } }))
        .status,
    ).toBe(409);
    expect((await preview.post({ ...preview.body, variant: original.variant })).status).toBe(409);
    expect(await backend.database.session.count()).toBe(1);
    expect(await backend.database.session.findFirstOrThrow()).toEqual(original);
  });

  it('requires authorization and validates bounded acquisition before creating traffic', async () => {
    const preview = await ConfigurationPreviewFixture.prepare(backend);
    expect((await preview.post(preview.body, '')).status).toBe(401);
    expect(
      (await preview.post({ ...preview.body, acquisition: { utm_campaign: 'x'.repeat(201) } }))
        .status,
    ).toBe(400);
    expect(
      (await preview.post({ ...preview.body, acquisition: { trafficOrigin: 'production' } }))
        .status,
    ).toBe(400);
    expect((await preview.post({ ...preview.body, trafficOrigin: 'production' })).status).toBe(400);
    expect(await backend.database.session.count()).toBe(0);
  });
  it('keeps acquisition independent from a colliding configured variant override', async () => {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
    const original = ConfigurationImportFixtures.original(3);
    const imported = await backend.configurationImports.import({
      ...original,
      experiment: { ...original.experiment, overrideQueryParam: 'utm_campaign' },
    });
    const body = {
      operationIdentifier: randomUUID(),
      clientTimestamp: new Date().toISOString(),
      acquisition: { utm_campaign: 'A' },
    };
    const randomResponse = await PublicationHttpFixtures.post(
      backend,
      `configurations/${imported.version.identifier}/preview`,
      cookie,
      body,
    );
    expect(randomResponse.status).toBe(201);
    const randomSession = await backend.database.session.findFirstOrThrow();
    expect(randomSession).toMatchObject({
      assignmentSource: 'random',
      campaign: 'A',
      trafficOrigin: 'synthetic',
    });

    const forcedResponse = await PublicationHttpFixtures.post(
      backend,
      `configurations/${imported.version.identifier}/preview`,
      cookie,
      { ...body, operationIdentifier: randomUUID(), variant: 'B' },
    );
    expect(forcedResponse.status).toBe(201);
    const forcedSession = await backend.database.session.findFirstOrThrow({
      where: { assignmentSource: 'forced' },
    });
    expect(forcedSession).toMatchObject({
      variant: 'B',
      campaign: 'A',
      trafficOrigin: 'synthetic',
      acquisitionParameters: { utm_campaign: 'A' },
    });
  });
  it('rejects an expired preview retry before changing its access credential', async () => {
    const preview = await ConfigurationPreviewFixture.prepare(backend);
    expect((await preview.post(preview.body)).status).toBe(201);
    const session = await backend.database.session.findFirstOrThrow();
    await backend.database.session.update({
      where: { identifier: session.identifier },
      data: { expiresAt: new Date(0) },
    });

    const replay = await preview.post(preview.body);
    expect(replay.status).toBe(401);
    expect(replay.headers.has('set-cookie')).toBe(false);
    expect(
      await backend.database.session.findUniqueOrThrow({
        where: { identifier: session.identifier },
      }),
    ).toMatchObject({ accessTokenHash: session.accessTokenHash });
    expect(await backend.database.sessionOperation.count()).toBe(1);
  });
  it('preserves the preview cookie when a conflicting retry is rejected', async () => {
    const preview = await ConfigurationPreviewFixture.prepare(backend);
    const created = await preview.post(preview.body);
    expect(created.status).toBe(201);
    expect(created.headers.has('set-cookie')).toBe(true);
    const session = await backend.database.session.findFirstOrThrow();

    const conflict = await preview.post({ ...preview.body, variant: 'B' });
    expect(conflict.status).toBe(409);
    expect(conflict.headers.has('set-cookie')).toBe(false);
    expect(
      await backend.database.session.findUniqueOrThrow({
        where: { identifier: session.identifier },
      }),
    ).toMatchObject({ accessTokenHash: session.accessTokenHash });
  });
});
