import { createClient } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const RemoteMigrationDatabase = {
  async create() {
    const directory = await mkdtemp(join(tmpdir(), 'kelpie-libsql-migration-'));
    const url = `file:${join(directory, 'database.sqlite')}`;
    const client = createClient({ url });

    return {
      client,
      url,
      async close() {
        client.close();
        await rm(directory, { recursive: true, force: true });
      },
    };
  },
} as const;
