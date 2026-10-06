import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BuildPolicy } from './script-policy.mjs';

const repositoryDirectory = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = resolve('distribution');
const allowedDirectories = BuildPolicy.outputDirectories.map((directory) =>
  resolve(repositoryDirectory, directory),
);
assert.ok(
  allowedDirectories.includes(outputDirectory),
  'Build cleanup must run from a configured workspace and only remove its generated output.',
);
await rm(outputDirectory, { recursive: true, force: true });
