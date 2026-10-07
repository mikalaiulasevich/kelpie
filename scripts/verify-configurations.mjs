import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { isPlainObject } from 'es-toolkit/predicate';

import { ConfigurationIntegrityMessages } from './script-messages.mjs';
import { ConfigurationFiles } from './script-policy.mjs';

const ConfigurationIntegrity = {
  async manifest() {
    const directory = new URL(ConfigurationFiles.Directory, import.meta.url);
    /** @type {unknown} */
    const manifest = JSON.parse(
      await readFile(
        new URL(ConfigurationFiles.ManifestName, directory),
        ConfigurationFiles.TextEncoding,
      ),
    );
    assert.ok(isPlainObject(manifest), ConfigurationIntegrityMessages.InvalidManifest);
    const entries = Object.entries(manifest);
    const expectedNames = new Set(ConfigurationFiles.Versions.map(ConfigurationFiles.fileName));
    assert.equal(entries.length, expectedNames.size, ConfigurationIntegrityMessages.MissingEntries);

    for (const [fileName] of entries) {
      if (!expectedNames.has(fileName)) {
        throw new Error(ConfigurationIntegrityMessages.unexpectedEntry(fileName));
      }
    }

    return { directory, entries };
  },

  /** @param {URL} directory @param {string} fileName @param {unknown} expectedChecksum */
  async verifyFile(directory, fileName, expectedChecksum) {
    const contents = await readFile(new URL(fileName, directory));
    const actualChecksum = createHash(ConfigurationFiles.ChecksumAlgorithm)
      .update(contents)
      .digest(ConfigurationFiles.ChecksumEncoding);
    if (actualChecksum !== expectedChecksum) {
      throw new Error(ConfigurationIntegrityMessages.changedContents(fileName));
    }

    JSON.parse(contents.toString(ConfigurationFiles.TextEncoding));
    console.info(ConfigurationIntegrityMessages.verifiedContents(fileName));
  },

  async verify() {
    const { directory, entries } = await ConfigurationIntegrity.manifest();
    for (const [fileName, expectedChecksum] of entries) {
      await ConfigurationIntegrity.verifyFile(directory, fileName, expectedChecksum);
    }
  },
};

await ConfigurationIntegrity.verify();
