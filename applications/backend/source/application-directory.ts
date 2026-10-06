import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const candidateDirectories = [resolve(moduleDirectory, '..'), resolve(moduleDirectory, '../..')];
const resolvedDirectory = candidateDirectories.find((directory) =>
  existsSync(resolve(directory, 'prisma/schema.prisma')),
);
if (resolvedDirectory === undefined) {
  throw new Error('Cannot locate the backend application directory.');
}
export const applicationDirectory = resolvedDirectory;
