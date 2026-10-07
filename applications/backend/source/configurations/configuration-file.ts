import { open } from 'node:fs/promises';
import { ConfigurationCommandMessages } from './configuration-command-messages.js';
import { ConfigurationCommandPolicy } from './configuration-command-policy.js';

export const ConfigurationFile = {
  async read(path: string): Promise<unknown> {
    await using file = await open(path, 'r');
    const metadata = await file.stat();

    if (!metadata.isFile() || metadata.size > ConfigurationCommandPolicy.MaximumFileBytes) {
      throw new Error(ConfigurationCommandMessages.FileRequired);
    }

    const chunks: Buffer[] = [];
    // Inclusive end reads one extra byte to detect growth after stat without unbounded reads.
    const stream = file.createReadStream({
      end: ConfigurationCommandPolicy.MaximumFileBytes,
      autoClose: false,
    });

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const contents = Buffer.concat(chunks);

    if (contents.length > ConfigurationCommandPolicy.MaximumFileBytes) {
      throw new Error(ConfigurationCommandMessages.FileRequired);
    }

    return ConfigurationFile.parse(contents.toString(ConfigurationCommandPolicy.Encoding));
  },

  parse(contents: string): unknown {
    try {
      return JSON.parse(contents);
    } catch {
      throw new Error(ConfigurationCommandMessages.InvalidJson);
    }
  },
} as const;
