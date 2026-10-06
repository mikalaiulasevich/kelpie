import { MigrationFixtures } from '../fixtures/migration-history.js';
import { describe, expect, it } from 'vitest';
import { MigrationHistory } from '../../source/database/migration-history.js';

describe('Migration readiness', () => {
  it('requires every migration shipped with the application', () => {
    expect(MigrationHistory.isComplete(['initial', 'next'], [MigrationFixtures.completed])).toBe(
      false,
    );
  });

  it('accepts completed history independently of row order', () => {
    expect(
      MigrationHistory.isComplete(
        ['initial', 'next'],
        [{ ...MigrationFixtures.completed, migration_name: 'next' }, MigrationFixtures.completed],
      ),
    ).toBe(true);
  });

  it('rejects a failed attempt even when the same migration previously succeeded', () => {
    expect(
      MigrationHistory.isComplete(
        ['initial'],
        [{ ...MigrationFixtures.completed, unresolved: 1n }],
      ),
    ).toBe(false);
  });

  it('rejects an unresolved migration unknown to this application version', () => {
    expect(
      MigrationHistory.isComplete(
        ['initial'],
        [MigrationFixtures.completed, { migration_name: 'future', successful: 0n, unresolved: 1n }],
      ),
    ).toBe(false);
  });

  it('does not treat rolled-back attempts as successful migrations', () => {
    expect(
      MigrationHistory.isComplete(
        ['initial'],
        [{ ...MigrationFixtures.completed, successful: 0n }],
      ),
    ).toBe(false);
  });
});
