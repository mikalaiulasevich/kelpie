import type { BackendApplicationFixture } from './backend-application.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';

export const ConfigurationLibraryFixture = {
  async beyondFirstPage(backend: BackendApplicationFixture): Promise<void> {
    const original = ConfigurationImportFixtures.original();

    for (let version = 1; version <= 101; version += 1) {
      await backend.configurationImports.import({
        ...original,
        version,
        description: version === 1 ? 'Historical launch research' : 'Current operating model',
      });
    }
  },
} as const;
