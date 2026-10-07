import assert from 'node:assert/strict';
import { StepType } from '@kelpie/contracts';
import { PublicationService } from '../../source/publications/publication.service.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';
import { PublicationFixtures } from './publication-fixtures.js';
import type { BackendApplicationFixture } from './backend-application.js';

const SessionFailureStatements = {
  Install: `CREATE TEMP TRIGGER reject_session_event BEFORE INSERT ON Event BEGIN SELECT RAISE(ABORT, 'forced_session_event_failure'); END`,
  Remove: 'DROP TRIGGER IF EXISTS reject_session_event',
} as const;

export const SessionCommandFixtures = {
  async publishOptionalNumeric(backend: BackendApplicationFixture): Promise<void> {
    const original = ConfigurationImportFixtures.original();
    const numeric = original.steps['team_size'];
    assert.ok(numeric?.type === StepType.Number);
    const imported = await backend.configurationImports.import({
      ...original,
      version: 2,
      steps: {
        ...original.steps,
        team_size: {
          ...numeric,
          input: { ...numeric.input, name: 'headcount' },
          validation: { ...numeric.validation, required: false },
        },
      },
    });
    const administrator = await backend.database.administrator.findFirstOrThrow();
    await backend
      .getService(PublicationService)
      .publish(
        PublicationFixtures.request(
          imported.version.funnelIdentifier,
          imported.version.identifier,
          1,
        ),
        administrator.identifier,
      );
  },
  rejectEvents(backend: BackendApplicationFixture): Promise<number> {
    return backend.database.$executeRawUnsafe(SessionFailureStatements.Install);
  },
  restoreEvents(backend: BackendApplicationFixture): Promise<number> {
    return backend.database.$executeRawUnsafe(SessionFailureStatements.Remove);
  },
} as const;
