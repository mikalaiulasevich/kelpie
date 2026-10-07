import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { ConfigurationImportFixtures } from '../fixtures/configuration-import-fixtures.js';
import { ConfigurationImportCases } from '../cases/configuration-import-cases.js';

describe('configuration imports with real SQLite', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
  });

  afterEach(async () => {
    await backend?.close();
  });

  it.each(ConfigurationImportCases.SuppliedVersions)(
    'stores supplied version %s without publication or activation',
    async (version) => {
      const document = ConfigurationImportFixtures.original(version);

      const imported = await backend.configurationImports.import(document);
      const stored = await backend.database.funnelVersion.findUniqueOrThrow({
        where: { identifier: imported.version.identifier },
      });
      const funnel = await backend.database.funnel.findUniqueOrThrow({
        where: { identifier: document.funnelId },
      });

      expect(imported.outcome).toBe('created');
      expect(imported.version).toMatchObject({
        funnelIdentifier: document.funnelId,
        version,
        schemaVersion: '1.0',
      });
      expect(imported.version.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(stored.document).toEqual(document);
      expect(stored.checksum).toBe(imported.version.checksum);
      expect(funnel.activeVersionIdentifier).toBeNull();
      expect(funnel.revision).toBe(0);
      expect(await backend.database.publication.count()).toBe(0);
    },
  );

  it.each(ConfigurationImportCases.InvalidDocuments)(
    'rejects $name without creating persistence records',
    async ({ document }) => {
      await expect(backend.configurationImports.import(document)).rejects.toMatchObject({
        code: 'invalid',
        issues: expect.arrayContaining([expect.objectContaining({ path: expect.any(String) })]),
      });

      expect(await backend.database.funnel.count()).toBe(0);
      expect(await backend.database.funnelVersion.count()).toBe(0);
      expect(await backend.database.publication.count()).toBe(0);
    },
  );

  it('rejects structurally valid documents with broken result references before writing', async () => {
    const document = ConfigurationImportFixtures.original();

    await expect(
      backend.configurationImports.import({ ...document, defaultResultId: 'missing_result' }),
    ).rejects.toMatchObject({
      code: 'invalid',
      issues: [{ path: '/defaultResultId', message: 'Unknown default result.' }],
    });

    expect(await backend.database.funnel.count()).toBe(0);
    expect(await backend.database.funnelVersion.count()).toBe(0);
  });

  it('returns the same immutable version for exact and object-key reordered imports', async () => {
    const document = ConfigurationImportFixtures.original();
    const original = structuredClone(document);

    const created = await backend.configurationImports.import(document);
    const repeated = await backend.configurationImports.import(document);
    const reordered = await backend.configurationImports.import(
      ConfigurationImportFixtures.reversedObjectKeys(document),
    );

    expect(repeated).toEqual({ ...created, outcome: 'existing' });
    expect(reordered).toEqual(repeated);
    expect(await backend.database.funnelVersion.count()).toBe(1);
    expect(await backend.database.funnel.count()).toBe(1);
    expect(document).toEqual(original);
  });

  it('rejects changed content under an existing funnel/version without rewriting it', async () => {
    const document = ConfigurationImportFixtures.original();
    const created = await backend.configurationImports.import(document);
    const before = await backend.database.funnelVersion.findUniqueOrThrow({
      where: { identifier: created.version.identifier },
    });

    await expect(
      backend.configurationImports.import({ ...document, title: 'Changed title' }),
    ).rejects.toMatchObject({ code: 'conflict', issues: [] });

    expect(
      await backend.database.funnelVersion.findUniqueOrThrow({
        where: { identifier: created.version.identifier },
      }),
    ).toEqual(before);
    expect(await backend.database.funnelVersion.count()).toBe(1);
  });

  it('preserves array ordering as part of the document identity', async () => {
    const document = ConfigurationImportFixtures.mutableDocument();
    await backend.configurationImports.import(document);
    document.resultRules.reverse();

    await expect(backend.configurationImports.import(document)).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(await backend.database.funnelVersion.count()).toBe(1);
  });

  it('deduplicates simultaneous imports into one version and one created outcome', async () => {
    const document = ConfigurationImportFixtures.original();

    const results = await Promise.all([
      backend.configurationImports.import(document),
      backend.configurationImports.import(structuredClone(document)),
    ]);

    expect(results.map((result) => result.outcome).sort()).toEqual(['created', 'existing']);
    expect(new Set(results.map((result) => result.version.identifier)).size).toBe(1);
    expect(await backend.database.funnel.count()).toBe(1);
    expect(await backend.database.funnelVersion.count()).toBe(1);
    expect(await backend.database.publication.count()).toBe(0);
  });

  it('rolls back the newly created funnel when SQLite rejects its version insert', async () => {
    const document = ConfigurationImportFixtures.original();
    await ConfigurationImportFixtures.rejectVersionWrites(backend.database);

    try {
      // The SQLite adapter maps trigger aborts to Prisma's constraint-failure category.
      await expect(backend.configurationImports.import(document)).rejects.toMatchObject({
        code: 'P2003',
      });

      expect(await backend.database.funnel.count()).toBe(0);
      expect(await backend.database.funnelVersion.count()).toBe(0);
      expect(await backend.database.publication.count()).toBe(0);
    } finally {
      await ConfigurationImportFixtures.restoreVersionWrites(backend.database);
    }

    await expect(backend.configurationImports.import(document)).resolves.toMatchObject({
      outcome: 'created',
    });
  });

  it('preserves the committed winner when concurrent imports claim the same version differently', async () => {
    const documents = ConfigurationImportFixtures.conflictingDocuments();

    const results = await Promise.allSettled(
      documents.map((document) => backend.configurationImports.import(document)),
    );
    const stored = await backend.database.funnelVersion.findFirstOrThrow();

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    results.forEach((result, position) => {
      if (result.status === 'fulfilled') {
        expect(result.value.outcome).toBe('created');
        expect(stored.identifier).toBe(result.value.version.identifier);
        expect(stored.document).toEqual(documents[position]);
      } else {
        expect(result.reason).toMatchObject({ code: 'conflict', issues: [] });
      }
    });
    expect(await backend.database.funnel.count()).toBe(1);
    expect(await backend.database.funnelVersion.count()).toBe(1);
    expect(await backend.database.publication.count()).toBe(0);
  });

  it('snapshots caller data before the first asynchronous persistence boundary', async () => {
    const document = ConfigurationImportFixtures.mutableDocument();
    const original = structuredClone(document);

    const pending = backend.configurationImports.import(document);
    document.title = 'Mutated while importing';
    document.resultRules.reverse();
    const imported = await pending;
    const stored = await backend.database.funnelVersion.findUniqueOrThrow({
      where: { identifier: imported.version.identifier },
    });
    const repeated = await backend.configurationImports.import(original);

    expect(stored.document).toEqual(original);
    expect(repeated).toEqual({ ...imported, outcome: 'existing' });
    expect(await backend.database.funnelVersion.count()).toBe(1);
  });
});
