import { vi } from 'vitest';
import { DatabaseReadService } from '../../source/database/database-read.service.js';
import type {
  DatabaseReadOptions,
  DatabaseReadSnapshot,
} from '../../source/database/database-read-types.js';
import type { BackendApplicationFixture } from './backend-application.js';

export const AnalyticsReadBatchFixture = {
  observe(
    backend: BackendApplicationFixture,
    transform: (rows: readonly unknown[][]) => readonly unknown[][] = (rows) => rows,
  ) {
    const database = backend.getService(DatabaseReadService);
    const read = database.read.bind(database);
    const statementCounts: number[] = [];
    const spy = vi
      .spyOn(database, 'read')
      .mockImplementation(
        async <Result>(
          operation: (snapshot: DatabaseReadSnapshot) => Promise<Result>,
          options?: DatabaseReadOptions,
        ): Promise<Result> =>
          read(
            (snapshot) =>
              operation({
                transaction: snapshot.transaction,
                queryMany: async (statements) => {
                  statementCounts.push(statements.length);

                  return transform(await snapshot.queryMany(statements));
                },
              }),
            options,
          ),
      );

    return { spy, statementCounts };
  },
} as const;
