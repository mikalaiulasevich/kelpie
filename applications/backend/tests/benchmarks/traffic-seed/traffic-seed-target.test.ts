import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigurationImportFixtures } from '../../fixtures/configuration-import-fixtures.js';
import { TrafficSeedCommandFixture } from '../../fixtures/traffic-seed-command-fixture.js';
import { TrafficSeedTarget } from './traffic-seed-target.js';

describe('seed target configuration checkpoint', () => {
  it('uses target content and retains selected versions when publication changes during a retry', async () => {
    const fixture = await TrafficSeedCommandFixture.checkpoint();
    const { backend } = await TrafficSeedCommandFixture.timeline();

    try {
      await backend.configurationImports.import(ConfigurationImportFixtures.original(2));
      await TrafficSeedTarget.prepare(backend.database, fixture.options);
      const snapshotPath = resolve(fixture.output, 'configurations', 'versions.json');
      const original = await readFile(snapshotPath, 'utf8');
      const later = await backend.configurationImports.import({
        ...ConfigurationImportFixtures.original(3),
        version: 4,
      });
      await backend.database.funnel.update({
        where: { identifier: 'workstyle-planner' },
        data: { activeVersionIdentifier: later.version.identifier },
      });
      await TrafficSeedTarget.prepare(backend.database, fixture.options);
      expect(await readFile(snapshotPath, 'utf8')).toBe(original);
      expect(
        (
          await backend.database.funnel.findUniqueOrThrow({
            where: { identifier: 'workstyle-planner' },
          })
        ).activeVersionIdentifier,
      ).toBe(later.version.identifier);
      expect(await backend.database.session.count()).toBe(1);
    } finally {
      await backend.close();
      await rm(fixture.output, { recursive: true, force: true });
    }
  });
});
