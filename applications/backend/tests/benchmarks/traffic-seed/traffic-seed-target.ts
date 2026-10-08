import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isError, isNull } from 'es-toolkit/predicate';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { ConfigurationImportDocument } from '../../../source/configurations/configuration-import-document.js';
import { TrafficSeedMessages } from './traffic-seed-messages.js';
import { TrafficSeedPolicy } from './traffic-seed-policy.js';
import type { TrafficSeedOptions } from './traffic-seed-types.js';

export const TrafficSeedTarget = {
  async prepare(target: PrismaClient, options: TrafficSeedOptions): Promise<void> {
    const directory = resolve(options.output, 'configurations');
    await mkdir(directory, { recursive: true });

    for (const version of TrafficSeedPolicy.Versions) {
      const stored = await target.funnelVersion.findUnique({ where: { funnelIdentifier_version: { funnelIdentifier: TrafficSeedPolicy.FunnelIdentifier, version } } });
      assert.ok(!isNull(stored), TrafficSeedMessages.Target);
      const prepared = ConfigurationImportDocument.prepare(stored.document);
      assert.ok(ConfigurationImportDocument.matchesVersion(stored, prepared), TrafficSeedMessages.Target);
      const path = resolve(directory, `funnel-v${version}.json`);

      try {
        await writeFile(path, JSON.stringify(stored.document, null, 2), { flag: 'wx', mode: 0o600 });
      } catch (error) {
        if (!isError(error) || !('code' in error) || error.code !== 'EEXIST') {
          throw error;
        }

        const previous: unknown = JSON.parse(await readFile(path, 'utf8'));
        assert.equal(ConfigurationImportDocument.prepare(previous).checksum, prepared.checksum, TrafficSeedMessages.Checkpoint);
      }
    }
  },
} as const;
