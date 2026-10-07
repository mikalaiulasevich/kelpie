import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PublicationMigrationFixture } from '../fixtures/publication-migration-fixture.js';

describe('event observation migration with historical SQLite records', () => {
  let fixture: PublicationMigrationFixture;

  beforeEach(() => {
    fixture = PublicationMigrationFixture.create();
    fixture.migrateSessions();
  });

  afterEach(() => {
    fixture?.close();
  });

  it('preserves analytical facts and session state without inventing historical eligibility', () => {
    const before = fixture.historicalRows();

    fixture.migrateEventObservations();

    expect(fixture.historicalRows()).toEqual({
      ...before,
      events: before.events.map((event) => ({ ...event, observationRevision: null })),
    });
    expect(fixture.foreignKeyViolations()).toEqual([]);
  });
});
