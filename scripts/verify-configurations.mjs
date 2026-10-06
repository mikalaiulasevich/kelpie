import { ConfigurationIntegrityMessages } from './script-messages.mjs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ConfigurationFiles } from './script-policy.mjs';

const configurationsDirectory = new URL(ConfigurationFiles.directory, import.meta.url);
const manifest = JSON.parse(
  await readFile(
    new URL(ConfigurationFiles.manifestName, configurationsDirectory),
    ConfigurationFiles.textEncoding,
  ),
);

const expectedNames = new Set(ConfigurationFiles.versions.map(ConfigurationFiles.fileName));

for (const [fileName, expectedChecksum] of Object.entries(manifest)) {
  if (!expectedNames.has(fileName)) {
    throw new Error(ConfigurationIntegrityMessages.unexpectedEntry(fileName));
  }

  const contents = await readFile(new URL(fileName, configurationsDirectory));
  const actualChecksum = createHash(ConfigurationFiles.checksumAlgorithm)
    .update(contents)
    .digest(ConfigurationFiles.checksumEncoding);
  if (actualChecksum !== expectedChecksum) {
    throw new Error(ConfigurationIntegrityMessages.changedContents(fileName));
  }

  JSON.parse(contents.toString(ConfigurationFiles.textEncoding));
  console.info(`${fileName}: original checksum verified`);
}

if (Object.keys(manifest).length !== expectedNames.size) {
  throw new Error(ConfigurationIntegrityMessages.MissingEntries);
}
