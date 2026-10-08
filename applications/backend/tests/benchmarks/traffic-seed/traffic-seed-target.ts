import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isNull, isUndefined } from 'es-toolkit/predicate';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import { ConfigurationImportDocument } from '../../../source/configurations/configuration-import-document.js';
import { TrafficSeedMessages } from './traffic-seed-messages.js';
import { TrafficSeedPolicy } from './traffic-seed-policy.js';
import { TrafficSeedFiles } from './traffic-seed-files.js';
import type { TrafficSeedOptions } from './traffic-seed-types.js';

export const TrafficSeedTarget = {
  async prepare(target: PrismaClient, options: TrafficSeedOptions): Promise<void> {
    const directory = resolve(options.output, 'configurations');
    await mkdir(directory, { recursive: true });

    const funnel = await target.funnel.findUnique({ where: { identifier: TrafficSeedPolicy.FunnelIdentifier }, include: { activeVersion: true } });
    assert.ok(!isNull(funnel) && !isNull(funnel.activeVersion), TrafficSeedMessages.Target);
    const preceding = await target.funnelVersion.findMany({ where: { funnelIdentifier: funnel.identifier, version: { lte: funnel.activeVersion.version } }, orderBy: { version: 'desc' }, take: TrafficSeedPolicy.VersionCount });
    const following = await target.funnelVersion.findMany({ where: { funnelIdentifier: funnel.identifier, version: { gt: funnel.activeVersion.version } }, orderBy: { version: 'asc' }, take: TrafficSeedPolicy.VersionCount - preceding.length });
    const versions = [...preceding, ...following].sort((left, right) => left.version - right.version);
    assert.equal(versions.length, TrafficSeedPolicy.VersionCount, TrafficSeedMessages.Target);

    for (const [index, stored] of versions.entries()) {
      assert.ok(!isUndefined(stored), TrafficSeedMessages.Target);
      const prepared = ConfigurationImportDocument.prepare(stored.document);
      assert.ok(ConfigurationImportDocument.matchesVersion(stored, prepared), TrafficSeedMessages.Target);
      const path = resolve(directory, `funnel-v${index + 1}.json`);

      if (!await TrafficSeedFiles.writeOnce(path, JSON.stringify(stored.document, null, 2))) {
        const previous: unknown = JSON.parse(await readFile(path, 'utf8'));
        assert.equal(ConfigurationImportDocument.prepare(previous).checksum, prepared.checksum, TrafficSeedMessages.Checkpoint);
      }
    }
  },
} as const;
