import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PublicationMigrationFixture } from '../fixtures/publication-migration-fixture.js';

describe('session command migration with populated legacy SQLite', () => {
  let fixture: PublicationMigrationFixture;

  beforeEach(() => {
    fixture = PublicationMigrationFixture.create();
  });

  afterEach(() => {
    fixture?.close();
  });

  it('preserves legacy sessions, answers, operations and events without inventing confirmations', () => {
    const before = fixture.historicalRows();

    fixture.migrateSessions();

    expect(fixture.historicalRows()).toEqual({
      ...before,
      sessions: before.sessions.map((session) => ({ ...session, initialState: null })),
      answers: before.answers.map((answer) => ({ ...answer, confirmationRevision: null })),
    });
    expect(fixture.transitions()).toEqual([]);
    expect(fixture.foreignKeyViolations()).toEqual([]);
  });

  it('rejects transitions referring to an operation belonging to another session', () => {
    fixture.migrateSessions();
    fixture.prepareOtherSession();

    expect(() => fixture.insertTransition('other-session', 'old-operation', 1)).toThrow(
      'FOREIGN KEY constraint failed',
    );
    expect(fixture.transitions()).toEqual([]);
    fixture.insertTransition('old-session', 'old-operation', 1);
    expect(fixture.transitions()).toEqual([
      { sessionIdentifier: 'old-session', operationIdentifier: 'old-operation', revision: 1 },
    ]);
    expect(fixture.foreignKeyViolations()).toEqual([]);
  });

  it('enforces revision uniqueness per session while allowing another session the same revision', () => {
    fixture.migrateSessions();
    fixture.prepareOtherSession();
    fixture.insertTransition('old-session', 'old-operation', 1);

    expect(() => fixture.insertTransition('old-session', 'old-operation', 1)).toThrow(
      'UNIQUE constraint failed: SessionTransition.sessionIdentifier, SessionTransition.revision',
    );
    fixture.insertTransition('other-session', 'other-operation', 1);
    expect(fixture.transitions()).toEqual([
      { sessionIdentifier: 'old-session', operationIdentifier: 'old-operation', revision: 1 },
      { sessionIdentifier: 'other-session', operationIdentifier: 'other-operation', revision: 1 },
    ]);
    expect(fixture.foreignKeyViolations()).toEqual([]);
  });
});
