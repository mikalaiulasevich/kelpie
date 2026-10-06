import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { ConfigurationIntegrityMessages } from './script-messages.mjs';
import { ConfigurationFiles } from './script-policy.mjs';

const configurationsDirectory = new URL(ConfigurationFiles.Directory, import.meta.url);
const manifest = JSON.parse(
  await readFile(
    new URL(ConfigurationFiles.ManifestName, configurationsDirectory),
    ConfigurationFiles.TextEncoding,
  ),
);

const expectedNames = new Set(ConfigurationFiles.Versions.map(ConfigurationFiles.fileName));

for (const [fileName, expectedChecksum] of Object.entries(manifest)) {
  if (!expectedNames.has(fileName)) {
    throw new Error(ConfigurationIntegrityMessages.unexpectedEntry(fileName));
  }

  const contents = await readFile(new URL(fileName, configurationsDirectory));
  const actualChecksum = createHash(ConfigurationFiles.ChecksumAlgorithm)
    .update(contents)
    .digest(ConfigurationFiles.ChecksumEncoding);
  if (actualChecksum !== expectedChecksum) {
    throw new Error(ConfigurationIntegrityMessages.changedContents(fileName));
  }

  JSON.parse(contents.toString(ConfigurationFiles.TextEncoding));
  console.info(ConfigurationIntegrityMessages.verifiedContents(fileName));
}

if (Object.keys(manifest).length !== expectedNames.size) {
  throw new Error(ConfigurationIntegrityMessages.MissingEntries);
}
