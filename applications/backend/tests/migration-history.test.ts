import { describe, expect, it } from 'vitest';
import { MigrationHistory } from '../source/database/migration-history.js';

const completedMigration = {
  migration_name: 'initial',
  successful: 1n,
  unresolved: 0n,
};

describe('Migration readiness', () => {
  it('requires every migration shipped with the application', () => {
    expect(MigrationHistory.isComplete(['initial', 'next'], [completedMigration])).toBe(false);
  });

  it('accepts completed history independently of row order', () => {
    expect(
      MigrationHistory.isComplete(
        ['initial', 'next'],
        [{ ...completedMigration, migration_name: 'next' }, completedMigration],
      ),
    ).toBe(true);
  });

  it('rejects a failed attempt even when the same migration previously succeeded', () => {
    expect(
      MigrationHistory.isComplete(['initial'], [{ ...completedMigration, unresolved: 1n }]),
    ).toBe(false);
  });

  it('rejects an unresolved migration unknown to this application version', () => {
    expect(
      MigrationHistory.isComplete(
        ['initial'],
        [completedMigration, { migration_name: 'future', successful: 0n, unresolved: 1n }],
      ),
    ).toBe(false);
  });

  it('does not treat rolled-back attempts as successful migrations', () => {
    expect(
      MigrationHistory.isComplete(['initial'], [{ ...completedMigration, successful: 0n }]),
    ).toBe(false);
  });
});
