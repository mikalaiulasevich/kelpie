import type { BackendApplicationFixture } from './backend-application.js';

const SessionFailureStatements = {
  Install: `CREATE TEMP TRIGGER reject_session_event BEFORE INSERT ON Event BEGIN SELECT RAISE(ABORT, 'forced_session_event_failure'); END`,
  Remove: 'DROP TRIGGER IF EXISTS reject_session_event',
} as const;

export const SessionCommandFixtures = {
  rejectEvents(backend: BackendApplicationFixture): Promise<number> {
    return backend.database.$executeRawUnsafe(SessionFailureStatements.Install);
  },
  restoreEvents(backend: BackendApplicationFixture): Promise<number> {
    return backend.database.$executeRawUnsafe(SessionFailureStatements.Remove);
  },
} as const;
