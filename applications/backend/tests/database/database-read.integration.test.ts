import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { DatabaseReadService } from '../../source/database/database-read.service.js';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { DatabaseReadFixture } from '../fixtures/database-read-fixture.js';

describe('dedicated database read snapshots', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await backend?.close();
  });

  it('keeps ORM metadata and batched reads coherent while the operational WAL connection commits independently', async () => {
    const reader = backend.getService(DatabaseReadService);
    await backend.database.applicationSecret.create({
      data: { identifier: 'snapshot', value: 'before' },
    });
    expect(reader.client).not.toBe(backend.database);

    await reader.read(async ({ transaction, queryMany }) => {
      expect(
        (
          await transaction.applicationSecret.findUniqueOrThrow({
            where: { identifier: 'snapshot' },
          })
        ).value,
      ).toBe('before');
      await backend.database.applicationSecret.update({
        where: { identifier: 'snapshot' },
        data: { value: 'after' },
      });
      expect(
        await queryMany([
          Prisma.sql`SELECT value FROM "ApplicationSecret" WHERE identifier = ${'snapshot'}`,
        ]),
      ).toEqual([[{ value: 'before' }]]);
    });
    expect(
      await reader.read(({ queryMany }) =>
        queryMany([
          Prisma.sql`SELECT value FROM "ApplicationSecret" WHERE identifier = ${'snapshot'}`,
        ]),
      ),
    ).toEqual([[{ value: 'after' }]]);
  });

  it('rejects writes and cleans a failed snapshot without contaminating operational access', async () => {
    const reader = backend.getService(DatabaseReadService);
    await expect(
      reader.read(({ transaction }) =>
        transaction.applicationSecret.create({
          data: { identifier: 'forbidden', value: 'forbidden' },
        }),
      ),
    ).rejects.toThrow();
    expect(
      await backend.database.applicationSecret.count({ where: { identifier: 'forbidden' } }),
    ).toBe(0);
    const failure = new Error('injected reader failure');
    await expect(
      reader.read(async ({ queryMany }) => {
        await queryMany([Prisma.sql`SELECT 1 AS value`]);
        throw failure;
      }),
    ).rejects.toBe(failure);
    await backend.database.applicationSecret.create({
      data: { identifier: 'allowed', value: 'allowed' },
    });
    expect(
      await reader.read(({ transaction }) =>
        transaction.applicationSecret.count({ where: { identifier: 'allowed' } }),
      ),
    ).toBe(1);
  });

  it('preserves initialization and cleanup failures and rejects reads after shutdown', async () => {
    const reader = DatabaseReadFixture.service(backend);
    const initialization = new Error('injected connect failure');
    const cleanup = new Error('injected cleanup failure');
    vi.spyOn(reader.client, '$connect').mockRejectedValueOnce(initialization);
    const disconnect = vi.spyOn(reader.client, '$disconnect').mockRejectedValueOnce(cleanup);

    await expect(reader.onModuleInit()).rejects.toMatchObject({
      errors: [initialization, cleanup],
    });
    expect(disconnect).toHaveBeenCalledTimes(1);
    await expect(reader.read(async () => 1)).rejects.toThrow('unavailable');
    await reader.onModuleInit();
    await reader.onApplicationShutdown();
    await reader.onApplicationShutdown();
    await expect(reader.read(async () => 1)).rejects.toThrow('unavailable');
    expect(await backend.database.applicationSecret.count()).toBeGreaterThanOrEqual(0);
  });
});
