import { EventEmitter, once } from 'node:events';
import { vi } from 'vitest';
import type { DatabaseReadService } from '../../source/database/database-read.service.js';

const AnalyticsReadIsolationMessages = {
  ReportFinishedBeforeHold: 'The analytics response finished before the snapshot was held.',
} as const;

export const AnalyticsReadIsolationFixture = {
  OperationalRequestDeadlineMilliseconds: 2_000,

  holdNextReport(database: DatabaseReadService) {
    const entered = new EventEmitter();
    const release = new EventEmitter();
    const enteredPromise = once(entered, 'entered').then(() => undefined);
    const releasedPromise = once(release, 'released').then(() => undefined);
    const read = database.read.bind(database);
    const replacement = vi.spyOn(database, 'read').mockImplementationOnce((operation, options) =>
      read(
        (snapshot) =>
          operation({
            ...snapshot,
            async queryMany(statements) {
              entered.emit('entered');
              await releasedPromise;

              return snapshot.queryMany(statements);
            },
          }),
        options,
      ),
    );

    return {
      waitUntilHeld(report: Promise<Response>): Promise<void> {
        return Promise.race([
          enteredPromise,
          report.then(() => {
            throw new Error(AnalyticsReadIsolationMessages.ReportFinishedBeforeHold);
          }),
        ]);
      },

      release() {
        release.emit('released');
      },

      restore() {
        replacement.mockRestore();
      },
    };
  },
} as const;
