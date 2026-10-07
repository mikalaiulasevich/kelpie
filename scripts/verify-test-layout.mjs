import { readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TestLayoutMessages } from './script-messages.mjs';
import { TestLayoutPolicy } from './script-policy.mjs';

const TestLayout = {
  /** @param {string} directory @param {string} testDirectory */
  async inspect(directory, testDirectory) {
    for (const directoryEntry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = join(directory, directoryEntry.name);

      if (
        directoryEntry.isDirectory() &&
        !TestLayoutPolicy.IgnoredDirectories.has(directoryEntry.name)
      ) {
        await TestLayout.inspect(entryPath, testDirectory);
      } else if (
        directoryEntry.isFile() &&
        TestLayoutPolicy.TestFilePattern.test(directoryEntry.name) &&
        !entryPath.startsWith(testDirectory + sep)
      ) {
        throw new Error(TestLayoutMessages.misplacedFile(entryPath));
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

console.info(TestLayoutMessages.Passed);
