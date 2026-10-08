import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteMigrationExecution } from '../../source/database/remote-migration-execution.js';
import { RemoteMigrations } from '../../source/database/remote-migrations.js';

describe('migration command client cleanup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves migration and cleanup failures without retrying either operation', async () => {
    const client = createClient({ url: ':memory:' });
    const failure = new Error('migration failed');
    const cleanup = new Error('client close failed');
    const apply = vi.spyOn(RemoteMigrations, 'apply').mockRejectedValueOnce(failure);
    const originalClose = client.close.bind(client);
    const close = vi.spyOn(client, 'close').mockImplementationOnce(() => {
      originalClose();
      throw cleanup;
    });

    try {
      await expect(RemoteMigrationExecution.run(client)).rejects.toMatchObject({
        errors: [failure, cleanup],
      });
      expect(apply).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
      expect(client.closed).toBe(true);
    } finally {
      originalClose();
    }
  });

  it('reports a successful migration cleanup failure without retrying migration or cleanup', async () => {
    const client = createClient({ url: ':memory:' });
    const cleanup = new Error('client close failed');
    const apply = vi.spyOn(RemoteMigrations, 'apply').mockResolvedValueOnce(10);
    const originalClose = client.close.bind(client);
    const close = vi.spyOn(client, 'close').mockImplementationOnce(() => {
      originalClose();
      throw cleanup;
    });

    try {
      await expect(RemoteMigrationExecution.run(client)).rejects.toBe(cleanup);
      expect(apply).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
      expect(client.closed).toBe(true);
    } finally {
      originalClose();
    }
  });
});
