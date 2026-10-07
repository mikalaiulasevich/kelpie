import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdministrationFixture } from '../fixtures/administration.js';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { ConfigurationImportFixtures } from '../fixtures/configuration-import-fixtures.js';
import { PublicationCases } from '../cases/publication-cases.js';

describe('protected immutable configuration document HTTP', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await AdministrationFixture.create();
  });

  afterEach(async () => {
    await backend?.close();
  });

  it('authorizes before identifier lookup and never caches unauthorized documents', async () => {
    const response = await backend.request('/api/administration/configurations/invalid');

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).not.toHaveProperty('document');
  });

  it.each(PublicationCases.SuppliedVersions)(
    'returns the exact supplied v%s document and immutable metadata without publication',
    async (versionNumber) => {
      const original = ConfigurationImportFixtures.original(versionNumber);
      const imported = await backend.configurationImports.import(original);
      const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
      const response = await backend.request(
        `/api/administration/configurations/${imported.version.identifier}`,
        { headers: { cookie } },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual({ version: imported.version, document: original });
      expect(await backend.database.publication.count()).toBe(0);
      expect(await backend.database.funnelVersion.count()).toBe(1);
      expect(
        await backend.database.funnel.findUniqueOrThrow({
          where: { identifier: original.funnelId },
        }),
      ).toMatchObject({ activeVersionIdentifier: null, revision: 0 });
    },
  );

  it('distinguishes malformed identifiers and missing UUIDs after authentication', async () => {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
    const malformed = await backend.request('/api/administration/configurations/invalid', {
      headers: { cookie },
    });
    const missing = await backend.request(`/api/administration/configurations/${randomUUID()}`, {
      headers: { cookie },
    });

    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toMatchObject({
      code: 'invalid_request',
      message: 'Request could not be processed.',
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      code: 'not_found',
      message: 'Request could not be processed.',
    });
    expect(malformed.headers.get('cache-control')).toBe('no-store');
    expect(missing.headers.get('cache-control')).toBe('no-store');
  });

  it.each(PublicationCases.CorruptedVersions)(
    'rejects corrupt stored $name without exposing the document',
    async ({ data }) => {
      const imported = await backend.configurationImports.import(
        ConfigurationImportFixtures.original(),
      );
      await backend.database.funnelVersion.update({
        where: { identifier: imported.version.identifier },
        data,
      });
      const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
      const response = await backend.request(
        `/api/administration/configurations/${imported.version.identifier}`,
        { headers: { cookie } },
      );

      expect(response.status).toBe(500);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const body: unknown = await response.json();

      expect(body).not.toHaveProperty('document');
      expect(body).not.toHaveProperty('version');
      expect(body).toMatchObject({
        code: 'internal_error',
        requestIdentifier: expect.any(String),
      });
      expect(await backend.database.publication.count()).toBe(0);
    },
  );

  it('rejects revoked administration sessions before returning stored configuration', async () => {
    const imported = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(),
    );
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
    await backend.database.administratorSession.updateMany({ data: { revokedAt: new Date() } });
    const response = await backend.request(
      `/api/administration/configurations/${imported.version.identifier}`,
      { headers: { cookie } },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).not.toHaveProperty('document');
  });
});
