import { TestLayoutMessages } from './script-messages.mjs';
import { readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TestLayoutPolicy = {
  Workspaces: [
    'applications/backend',
    'applications/frontend',
    'packages/contracts',
    'packages/funnel-runtime',
  ],
  IgnoredDirectories: new Set(['node_modules', 'distribution', 'generated', 'coverage']),
  TestFilePattern: /[.-](?:test|spec|fixture|fixtures|case|cases|typecheck)\.[cm]?[jt]sx?$/,
  Directory: 'tests',
};

const TestLayout = {
  /** @param {string} directory @param {string} testDirectory */
  async inspect(directory, testDirectory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && !TestLayoutPolicy.IgnoredDirectories.has(entry.name)) {
        await TestLayout.inspect(path, testDirectory);
      } else if (
        entry.isFile() &&
        TestLayoutPolicy.TestFilePattern.test(entry.name) &&
        !path.startsWith(testDirectory + sep)
      ) {
        throw new Error(TestLayoutMessages.misplacedFile(path));
      }
    }
  },
};

const repositoryDirectory = fileURLToPath(new URL('../', import.meta.url));
for (const workspace of TestLayoutPolicy.Workspaces) {
  const workspaceDirectory = join(repositoryDirectory, workspace);
  await TestLayout.inspect(
    workspaceDirectory,
    join(workspaceDirectory, TestLayoutPolicy.Directory),
  );
}

console.info('All test suites, fixtures, cases and typecheck files are inside tests/.');
