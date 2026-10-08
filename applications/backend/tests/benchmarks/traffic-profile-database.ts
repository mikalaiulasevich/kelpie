import { randomUUID } from 'node:crypto';
import { chmod, mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Prisma } from '../../generated/prisma/client.js';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';

export const TrafficProfileDatabase = {
  async snapshot(backend: BackendApplicationFixture, directory: string) {
    await mkdir(directory, { recursive: true });
    const path = resolve(directory, `synthetic-dataset-${randomUUID()}.sqlite`);

    // SQLite creates a consistent copy, including committed WAL contents. Never copy live files.
    await backend.database.$executeRaw(Prisma.sql`VACUUM INTO ${path}`);
    await chmod(path, 0o600);
    const metadata = await stat(path);

    return { path, bytes: metadata.size };
  },
} as const;
