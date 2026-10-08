import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { DatabaseReadAdapter } from '../../source/database/database-read-adapter.js';
import { DatabaseReadFixture } from '../fixtures/database-read-fixture.js';
import { DatabaseReadInvalidStatements } from '../cases/database-read-cases.js';

describe('native database read snapshot adapter', () => {
  it('uses one parameterized native batch on the exact read-only transaction with lossless scalar records', async () => {
    const { adapter, client } = DatabaseReadFixture.native();
    await client.execute('CREATE TABLE evidence (identifier TEXT PRIMARY KEY)');
    await client.execute('PRAGMA query_only = ON');
    const transaction = await client.transaction('deferred');
    const batch = vi.spyOn(transaction, 'batch');
    const queryMany = adapter.queries();

    try {
      expect(
        await queryMany([
          Prisma.sql`SELECT ${"'); DELETE FROM evidence; --"} AS text, 9223372036854775807 AS integer, 1.25 AS real, NULL AS absent`,
          Prisma.sql`SELECT ${new Date('2026-10-08T00:00:00Z')} AS timestamp, ${true} AS enabled`,
        ]),
      ).toEqual([
        [
          {
            text: "'); DELETE FROM evidence; --",
            integer: 9223372036854775807n,
            real: 1.25,
            absent: null,
          },
        ],
        [{ timestamp: '2026-10-08T00:00:00.000+00:00', enabled: 1 }],
      ]);
      expect(batch).toHaveBeenCalledTimes(1);
      await expect(
        transaction.execute("INSERT INTO evidence VALUES ('blocked')"),
      ).rejects.toThrow();
    } finally {
      await transaction.rollback();
      vi.restoreAllMocks();
      client.close();
    }

    await expect(queryMany([Prisma.sql`SELECT 1`])).rejects.toThrow('snapshot is required');
  });

  it('reserves ownership before asynchronous acquisition, releases failed setup, and cannot reuse an old snapshot', async () => {
    const native = createClient({ url: ':memory:', intMode: 'bigint' });
    const acquire = vi.spyOn(native, 'transaction');
    vi.spyOn(PrismaLibSql.prototype, 'createClient').mockReturnValueOnce(native);
    const adapter = new DatabaseReadAdapter({ url: ':memory:' });
    const client = adapter.createClient({ url: ':memory:' });
    const failure = new Error('injected acquisition failure');
    acquire.mockRejectedValueOnce(failure);

    try {
      expect(() => adapter.queries()).toThrow('snapshot is required');
      const acquisition = client.transaction('write');
      await expect(client.transaction('write')).rejects.toThrow('already owns a snapshot');
      await expect(acquisition).rejects.toBe(failure);
      const first = await client.transaction('write');
      const oldQuery = adapter.queries();
      expect(acquire).toHaveBeenLastCalledWith('read');
      await first.rollback();
      const second = await client.transaction('write');

      try {
        await expect(oldQuery([Prisma.sql`SELECT 1`])).rejects.toThrow('snapshot is required');
        expect(await adapter.queries()([Prisma.sql`SELECT 2 AS value`])).toEqual([[{ value: 2n }]]);
      } finally {
        await second.rollback();
      }
    } finally {
      vi.restoreAllMocks();
      client.close();
    }
  });

  it.each(DatabaseReadInvalidStatements)(
    'rejects $name before native execution',
    async ({ statements }) => {
      const { adapter, client } = DatabaseReadFixture.native();
      const transaction = await client.transaction('read');
      const batch = vi.spyOn(transaction, 'batch');

      try {
        await expect(adapter.queries()(statements)).rejects.toThrow();
        expect(batch).not.toHaveBeenCalled();
      } finally {
        await transaction.rollback();
        vi.restoreAllMocks();
        client.close();
      }
    },
  );
});
