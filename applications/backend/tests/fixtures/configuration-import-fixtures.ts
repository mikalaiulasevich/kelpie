import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isPlainObject } from 'es-toolkit/predicate';
import { FunnelConfigurations, type FunnelConfiguration } from '@kelpie/contracts';
import type { DatabaseService } from '../../source/database/database.service.js';

const ConfigurationImportFailureStatements = {
  Install: `CREATE TEMP TRIGGER reject_configuration_version
    BEFORE INSERT ON FunnelVersion
    BEGIN SELECT RAISE(ABORT, 'forced_version_write_failure'); END`,
  Remove: 'DROP TRIGGER IF EXISTS reject_configuration_version',
} as const;

export const ConfigurationImportFixtures = {
  async rejectVersionWrites(database: DatabaseService['client']): Promise<void> {
    await database.$executeRawUnsafe(ConfigurationImportFailureStatements.Install);
  },

  async restoreVersionWrites(database: DatabaseService['client']): Promise<void> {
    await database.$executeRawUnsafe(ConfigurationImportFailureStatements.Remove);
  },

  conflictingDocuments(): ReadonlyPair<FunnelConfiguration> {
    const original = ConfigurationImportFixtures.original();

    return [original, { ...original, title: 'Concurrent conflicting title' }];
  },

  original(version = 1): FunnelConfiguration {
    const document: unknown = JSON.parse(
      readFileSync(
        new URL(`../../../../configurations/funnel-v${version}.json`, import.meta.url),
        'utf8',
      ),
    );
    const result = FunnelConfigurations.validate(document);
    assert.ok(result.valid);

    return result.configuration;
  },

  reversedObjectKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(ConfigurationImportFixtures.reversedObjectKeys);
    }

    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value)
          .reverse()
          .map(([key, child]) => [key, ConfigurationImportFixtures.reversedObjectKeys(child)]),
      );
    }

    return value;
  },

  mutableDocument() {
    const configuration = ConfigurationImportFixtures.original();

    return { ...configuration, resultRules: [...configuration.resultRules] };
  },
} as const;
