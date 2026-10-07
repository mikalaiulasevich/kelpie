import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PublicationMigrationFixture } from '../fixtures/publication-migration-fixture.js';

describe('publication revision migration with populated legacy SQLite', () => {
  let fixture: PublicationMigrationFixture;

  beforeEach(() => {
    fixture = PublicationMigrationFixture.create();
  });

  afterEach(() => {
    fixture?.close();
  });

  it('preserves activation pointers, history, pinned sessions, answers, operations and events', () => {
    const before = fixture.historicalRows();

    fixture.migrate();

    expect(fixture.historicalRows()).toEqual(before);
    expect(fixture.foreignKeyViolations()).toEqual([]);
  });

  it('orders equal timestamps by insertion and maintains each funnel revision floor', () => {
    fixture.migrate();

    expect(fixture.revisions()).toEqual({
      publications: [
        { identifier: 'a-second', revision: 3 },
        { identifier: 'older', revision: 1 },
        { identifier: 'other', revision: 1 },
        { identifier: 'z-first', revision: 2 },
      ],
      funnels: [
        { identifier: 'empty', revision: 0 },
        { identifier: 'other', revision: 9 },
        { identifier: 'work', revision: 3 },
      ],
    });
  });

  it('enforces unique activation revisions within a funnel after backfill', () => {
    fixture.migrate();
    const before = fixture.historicalRows();

    expect(() => fixture.insertDuplicateRevision()).toThrow(
      'UNIQUE constraint failed: Publication.funnelIdentifier, Publication.revision',
    );
    expect(fixture.historicalRows()).toEqual(before);
  });
});
