import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const configurationsDirectory = new URL('../configurations/', import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL('checksums.json', configurationsDirectory), 'utf8'),
);

for (const [fileName, expectedChecksum] of Object.entries(manifest)) {
  if (!/^funnel-v[123]\.json$/.test(fileName)) {
    throw new Error(`Unexpected configuration manifest entry: ${fileName}`);
  }

  const contents = await readFile(new URL(fileName, configurationsDirectory));
  const actualChecksum = createHash('sha256').update(contents).digest('hex');
  if (actualChecksum !== expectedChecksum) {
    throw new Error(`Configuration changed from its supplied contents: ${fileName}`);
  }

  JSON.parse(contents.toString('utf8'));
  console.info(`${fileName}: original checksum verified`);
}

if (Object.keys(manifest).length !== 3) {
  throw new Error('The manifest must contain all three supplied configurations.');
}
