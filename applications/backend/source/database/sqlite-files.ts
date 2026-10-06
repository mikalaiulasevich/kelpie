import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { SQLitePolicy } from './sqlite-policy.js';

export const SQLiteFiles = {
  async prepareDirectory(databaseUrl: string): Promise<void> {
    const databasePath = databaseUrl.slice(SQLitePolicy.FileUrlPrefix.length);
    await mkdir(dirname(databasePath), { recursive: true });
  },
} as const;
