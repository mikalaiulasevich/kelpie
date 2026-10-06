import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabasePaths } from '../database/database-paths.js';
import { ApplicationMessages } from './application-messages.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const candidateDirectories = [resolve(moduleDirectory, '../..'), resolve(moduleDirectory, '../../..')];
const resolvedDirectory = candidateDirectories.find((directory) =>
  existsSync(resolve(directory, DatabasePaths.Schema)),
);
if (resolvedDirectory === undefined) {
  throw new Error(ApplicationMessages.DirectoryUnavailable);
}

export const applicationDirectory = resolvedDirectory;
