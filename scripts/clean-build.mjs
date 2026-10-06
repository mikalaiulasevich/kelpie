import { BuildMessages } from './script-messages.mjs';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BuildPolicy } from './script-policy.mjs';

const repositoryDirectory = fileURLToPath(
  new URL(BuildPolicy.repositoryRelativePath, import.meta.url),
);
const outputDirectory = resolve(BuildPolicy.outputDirectoryName);
const allowedDirectories = BuildPolicy.outputDirectories.map((directory) =>
  resolve(repositoryDirectory, directory),
);
assert.ok(allowedDirectories.includes(outputDirectory), BuildMessages.UnsafeCleanup);
await rm(outputDirectory, { recursive: true, force: true });
