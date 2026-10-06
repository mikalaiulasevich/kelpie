import { readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TestLayoutPolicy = {
  workspaces: [
    'applications/backend',
    'applications/frontend',
    'packages/contracts',
    'packages/funnel-runtime',
  ],
  ignoredDirectories: new Set(['node_modules', 'distribution', 'generated', 'coverage']),
  testFilePattern: /[.-](?:test|spec|fixture|fixtures|case|cases|typecheck)\.[cm]?[jt]sx?$/,
  directory: 'tests',
};

const TestLayout = {
  /** @param {string} directory @param {string} testDirectory */
  async inspect(directory, testDirectory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && !TestLayoutPolicy.ignoredDirectories.has(entry.name)) {
        await TestLayout.inspect(path, testDirectory);
      } else if (
        entry.isFile() &&
        TestLayoutPolicy.testFilePattern.test(entry.name) &&
        !path.startsWith(testDirectory + sep)
      ) {
        throw new Error(`Test support and suites must be inside tests/: ${path}`);
      }
    }
  },
};

const repositoryDirectory = fileURLToPath(new URL('../', import.meta.url));
for (const workspace of TestLayoutPolicy.workspaces) {
  const workspaceDirectory = join(repositoryDirectory, workspace);
  await TestLayout.inspect(
    workspaceDirectory,
    join(workspaceDirectory, TestLayoutPolicy.directory),
  );
}

console.info('All test suites, fixtures, cases and typecheck files are inside tests/.');
