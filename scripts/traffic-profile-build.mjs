import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { TrafficBuildPolicy } from './script-policy.mjs';

const repositoryDirectory = fileURLToPath(new URL('../', import.meta.url));
// This fixed output is deliberately separate from the production distribution.
await rm(resolve(repositoryDirectory, TrafficBuildPolicy.OutputDirectory), {
  recursive: true,
  force: true,
});
execFileSync(
  process.execPath,
  [
    resolve(repositoryDirectory, TrafficBuildPolicy.CompilerPath),
    '--project',
    TrafficBuildPolicy.ProjectPath,
  ],
  { cwd: repositoryDirectory, stdio: 'inherit' },
);
