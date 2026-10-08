import { LibsqlError } from '@libsql/client';
import { describe, expect, it, vi } from 'vitest';
import { TrafficSeedTransportFixture } from '../../fixtures/traffic-seed-transport-fixture.js';
import { TrafficSeedImportFixture } from '../../fixtures/traffic-seed-import-fixture.js';
import { TrafficSeedRetryFixture } from '../../fixtures/traffic-seed-retry-fixture.js';
import { TrafficSeedImport } from './traffic-seed-import.js';
import { TrafficSeedImportRetry } from './traffic-seed-import-retry.js';
import type { TrafficSeedSessionGraph } from './traffic-seed-import-types.js';
import { TrafficSeedAbortCases } from '../../cases/traffic-seed/traffic-seed-abort-cases.js';
import {
  TrafficSeedIdleCases,
  TrafficSeedNonRetryableNativeCases,
} from '../../cases/traffic-seed/traffic-seed-native-failure-cases.js';

describe('bounded transaction-closure recovery during synthetic import', () => {
  it('retries the actual native TimeoutError category with the exact observed message', async () => {
    const failure = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    expect(failure.code).toBe(23);
    const operation = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue('verified');
    await expect(TrafficSeedImportRetry.run(operation)).resolves.toBe('verified');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it.each(TrafficSeedIdleCases)(
    'retries only the observed hosted idle rollback from $name',
    async ({ prisma }) => {
      const driver = new LibsqlError(
        'SQLITE_BUSY: SQLite error: interactive transaction was rolled back because the stream was idle for too long; retry the transaction',
        'SQLITE_BUSY',
      );
      const failure = prisma
        ? TrafficSeedRetryFixture.aborted(
            'P2039',
            `Database error. Code: \`N/A\`. Message: \`${driver.message}\``,
          )
        : driver;
      const operation = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue('verified');
      await expect(TrafficSeedImportRetry.run(operation)).resolves.toBe('verified');
      expect(operation).toHaveBeenCalledTimes(2);
    },
  );

  it.each(TrafficSeedNonRetryableNativeCases)('does not retry $name', async ({ create }) => {
    const failure = create();
    const operation = vi.fn().mockRejectedValue(failure);
    await expect(TrafficSeedImportRetry.run(operation)).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('recovers a transient postcommit verification failure by checking committed rows without reinsertion', async () => {
    const { source, target, transport, database } = await TrafficSeedTransportFixture.create();
    const reads = vi
      .spyOn(database.session, 'findMany')
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(TrafficSeedRetryFixture.aborted());
    const transactions = vi.spyOn(database, '$transaction');
    const preparations = vi.spyOn(transport, 'prepareGraphs');

    try {
      const receipt = await TrafficSeedImport.run(source.database, database, {
        runIdentifier: 'retry-postcommit-read',
        projectSession: TrafficSeedImportFixture.projectSession,
        prepareGraphs: (graphs) => transport.prepareGraphs(graphs),
      });
      expect(receipt).toMatchObject({ sessions: 1, inserted: 0, existing: 1, events: 1 });
      expect(reads).toHaveBeenCalledTimes(4);
      expect(transactions).not.toHaveBeenCalled();
      expect(preparations).toHaveBeenCalledTimes(1);
      expect(await database.session.count()).toBe(1);
      expect(await database.event.count()).toBe(1);
    } finally {
      vi.restoreAllMocks();
      await database.$disconnect();
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('retries a closure before writing then imports exactly one graph', async () => {
    const { source, target, transport, database } = await TrafficSeedTransportFixture.create();
    const prepare = transport.prepareGraphs.bind(transport);
    const writes = vi.spyOn(transport, 'prepareGraphs').mockImplementationOnce((graphs) => {
      prepare(graphs);

      return async () => {
        throw TrafficSeedRetryFixture.closed();
      };
    });

    try {
      const receipt = await TrafficSeedImport.run(source.database, database, {
        runIdentifier: 'retry-before-commit',
        projectSession: TrafficSeedImportFixture.projectSession,
        prepareGraphs: (graphs: readonly TrafficSeedSessionGraph[]) =>
          transport.prepareGraphs(graphs),
      });
      expect(receipt).toMatchObject({ sessions: 1, inserted: 1, existing: 0, events: 1 });
      expect(writes).toHaveBeenCalledTimes(2);
      expect(await database.session.count()).toBe(1);
      expect(await database.event.count()).toBe(1);
      expect(await database.sessionOperation.count()).toBe(1);
    } finally {
      vi.restoreAllMocks();
      await database.$disconnect();
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('verifies committed content after a lost acknowledgement without counting or inserting twice', async () => {
    const { source, target, transport, database } = await TrafficSeedTransportFixture.create();
    const transactions = vi.spyOn(database, '$transaction');
    const prepare = transport.prepareGraphs.bind(transport);
    const writes = vi.spyOn(transport, 'prepareGraphs').mockImplementationOnce((graphs) => {
      const commit = prepare(graphs);

      return async () => {
        await commit();
        throw TrafficSeedRetryFixture.closed();
      };
    });
    const options = {
      runIdentifier: 'retry-after-commit',
      projectSession: TrafficSeedImportFixture.projectSession,
      prepareGraphs: (graphs: readonly TrafficSeedSessionGraph[]) =>
        transport.prepareGraphs(graphs),
    };

    try {
      const receipt = await TrafficSeedImport.run(source.database, database, options);
      expect(receipt).toMatchObject({ sessions: 1, inserted: 0, existing: 1, events: 1 });
      expect(transactions).not.toHaveBeenCalled();
      expect(writes).toHaveBeenCalledTimes(1);
      expect(await database.session.count()).toBe(1);
      expect(await database.event.count()).toBe(1);
      transactions.mockClear();
      writes.mockClear();
      await source.database.session.updateMany({ data: { campaign: 'changed-content' } });
      await expect(TrafficSeedImport.run(source.database, database, options)).rejects.toThrow(
        'conflicts',
      );
      expect(transactions).not.toHaveBeenCalled();
      expect(writes).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
      await database.$disconnect();
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('stops after three recognized closures and preserves the final driver error', async () => {
    const failure = TrafficSeedRetryFixture.closed();
    const operation = vi.fn().mockRejectedValue(failure);
    await expect(TrafficSeedImportRetry.run(operation)).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it.each(TrafficSeedAbortCases)(
    'retries only the observed Prisma timeout for $name',
    async ({ code }) => {
      const failure = TrafficSeedRetryFixture.aborted(
        code,
        'Prisma read failed:\nThe operation was aborted due to timeout',
      );
      const operation = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue('verified');
      await expect(TrafficSeedImportRetry.run(operation)).resolves.toBe('verified');
      expect(operation).toHaveBeenCalledTimes(2);
      const exhausted = vi.fn().mockRejectedValue(failure);
      await expect(TrafficSeedImportRetry.run(exhausted)).rejects.toBe(failure);
      expect(exhausted).toHaveBeenCalledTimes(3);
    },
  );

  it('does not retry code23 without the exact timeout suffix, a different code, or a non-Prisma lookalike', async () => {
    const otherMessage = vi
      .fn()
      .mockRejectedValue(
        TrafficSeedRetryFixture.aborted('23', 'The operation was aborted for another reason'),
      );
    await expect(TrafficSeedImportRetry.run(otherMessage)).rejects.toThrow('another reason');
    expect(otherMessage).toHaveBeenCalledTimes(1);
    const otherCode = vi.fn().mockRejectedValue(TrafficSeedRetryFixture.aborted('24'));
    await expect(TrafficSeedImportRetry.run(otherCode)).rejects.toThrow('timeout');
    expect(otherCode).toHaveBeenCalledTimes(1);
    const lookalike = vi
      .fn()
      .mockRejectedValue({ code: '23', message: 'The operation was aborted due to timeout' });
    await expect(TrafficSeedImportRetry.run(lookalike)).rejects.toMatchObject({ code: '23' });
    expect(lookalike).toHaveBeenCalledTimes(1);
  });

  it('retries the observed P2039 transaction-closed wrapper without retrying other P2039 failures', async () => {
    const message =
      'Prisma transaction failed:\nDatabase error. Code: `N/A`. Message: `TRANSACTION_CLOSED: Cannot execute statements because the transaction is closed`';
    const wrapped = TrafficSeedRetryFixture.aborted('P2039', message);
    const retry = vi.fn().mockRejectedValueOnce(wrapped).mockResolvedValue('verified');
    await expect(TrafficSeedImportRetry.run(retry)).resolves.toBe('verified');
    expect(retry).toHaveBeenCalledTimes(2);
    const otherMessage = vi
      .fn()
      .mockRejectedValue(
        TrafficSeedRetryFixture.aborted(
          'P2039',
          'Database error. Code: `N/A`. Message: `SQLITE_CONSTRAINT: constraint failed`',
        ),
      );
    await expect(TrafficSeedImportRetry.run(otherMessage)).rejects.toThrow('constraint');
    expect(otherMessage).toHaveBeenCalledTimes(1);
    const lookalike = vi.fn().mockRejectedValue({ code: 'P2039', message });
    await expect(TrafficSeedImportRetry.run(lookalike)).rejects.toMatchObject({ code: 'P2039' });
    expect(lookalike).toHaveBeenCalledTimes(1);
  });

  it('does not retry conflicts, lookalike errors, or other driver categories', async () => {
    const conflict = vi
      .fn()
      .mockRejectedValue(new Error('Synthetic import conflicts with existing history.'));
    await expect(TrafficSeedImportRetry.run(conflict)).rejects.toThrow('conflicts');
    expect(conflict).toHaveBeenCalledTimes(1);
    const lookalike = vi.fn().mockRejectedValue({ code: 'TRANSACTION_CLOSED' });
    await expect(TrafficSeedImportRetry.run(lookalike)).rejects.toEqual({
      code: 'TRANSACTION_CLOSED',
    });
    expect(lookalike).toHaveBeenCalledTimes(1);
    const otherDriverFailure = vi
      .fn()
      .mockRejectedValue(new LibsqlError('Injected constraint failure', 'SQLITE_CONSTRAINT'));
    await expect(TrafficSeedImportRetry.run(otherDriverFailure)).rejects.toThrow('constraint');
    expect(otherDriverFailure).toHaveBeenCalledTimes(1);
  });
});
