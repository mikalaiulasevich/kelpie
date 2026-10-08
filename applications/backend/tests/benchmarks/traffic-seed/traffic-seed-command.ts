import assert from 'node:assert/strict';
import { realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Ajv } from 'ajv';
import { isUndefined } from 'es-toolkit/predicate';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { DatabaseAdapters } from '../../../source/database/database-adapters.js';
import { TrafficPolicy } from '../traffic/traffic-policy.js';
import { TrafficSeedImport } from './traffic-seed-import.js';
import { TrafficSeedTimeline } from './traffic-seed-timeline.js';
import { TrafficSeedMessages } from './traffic-seed-messages.js';
import { TrafficSeedPolicy } from './traffic-seed-policy.js';
import {
  TrafficSeedOptionsSchema,
  type TrafficSeedOptions,
} from './traffic-seed-types.js';
import type { TrafficSeedSessionGraph } from './traffic-seed-import-types.js';
import { TrafficSeedCheckpoint } from './traffic-seed-checkpoint.js';

const Validators = {
  options: new Ajv().compile<TrafficSeedOptions>(TrafficSeedOptionsSchema),

} as const;


const SeedSummary = {
  add(
    groups: Map<
      string,
      {
        day: string;
        version: number;
        variant: string;
        campaign: string;
        started: number;
        results: number;
        clicks: number;
        expired: number;
      }
    >,
    graph: TrafficSeedSessionGraph,
    anchor: string,
  ): void {
    const day = graph.createdAt.toISOString().slice(0, 10);
    const key = JSON.stringify([day, graph.version.version, graph.variant, graph.campaign]);
    const row = groups.get(key) ?? {
      day,
      version: graph.version.version,
      variant: graph.variant,
      campaign: graph.campaign ?? '',
      started: 0,
      results: 0,
      clicks: 0,
      expired: 0,
    };
    const names = new Set(graph.events.map((event) => event.name));
    row.started += Number(names.has('session_started'));
    row.results += Number(names.has('result_viewed'));
    row.clicks += Number(names.has('cta_clicked'));
    row.expired += Number(graph.expiresAt.getTime() < Date.parse(anchor));
    groups.set(key, row);
  },
} as const;

export const TrafficSeedCommand = {
  options(arguments_: readonly string[] = process.argv.slice(2)): TrafficSeedOptions {
    const values: Record<string, string> = {};

    for (const argument of arguments_) {
      const separator = argument.indexOf('=');
      const key = argument.slice(2, separator);
      assert.ok(
        argument.startsWith('--') &&
          separator > 2 &&
          ['target', 'run', 'sessions', 'days', 'seed', 'output'].includes(key) &&
          isUndefined(values[key]),
        TrafficSeedMessages.Arguments,
      );
      values[key] = argument.slice(separator + 1);
    }

    const options = {
      target: values['target'],
      runIdentifier: values['run'],
      sessions: Number(values['sessions'] ?? TrafficPolicy.Sessions),
      days: Number(values['days'] ?? TrafficSeedPolicy.Days),
      seed: Number(values['seed'] ?? TrafficPolicy.Seed),
      output: values['output'] ?? `test-results/traffic-seed-${values['run'] ?? 'missing'}`,
    };
    assert.ok(Validators.options(options), TrafficSeedMessages.Arguments);

    return options;
  },

  async destination(options: TrafficSeedOptions): Promise<string> {
    const url =
      process.env['DATABASE_URL'] ??
      (options.target === 'local' ? TrafficSeedPolicy.LocalDatabase : '');

    if (options.target === 'remote') {
      assert.ok(
        url.startsWith('libsql://') && process.env['DATABASE_AUTH_TOKEN'],
        TrafficSeedMessages.Target,
      );

      return url;
    }

    assert.ok(url.startsWith('file:'), TrafficSeedMessages.Target);
    const path = await realpath(resolve(url.slice('file:'.length)));

    return `file:${path}`;
  },

  async run(options: TrafficSeedOptions): Promise<void> {
    const destination = await this.destination(options);
    const checkpoint = await TrafficSeedCheckpoint.read(options);
    const dataset = await TrafficSeedCheckpoint.dataset(options);
    assert.notEqual(destination, `file:${dataset.path}`, TrafficSeedMessages.Target);
    const source = new PrismaClient({ adapter: DatabaseAdapters.create(`file:${dataset.path}`) });

    try {
      const target = new PrismaClient({
        adapter: DatabaseAdapters.create(
          destination,
          options.target === 'remote' ? process.env['DATABASE_AUTH_TOKEN'] : undefined,
        ),
      });

      try {
        assert.equal(await source.session.count(), options.sessions, TrafficSeedMessages.Source);
        const sourceIdentifiers = new Set(
          (await source.session.findMany({ select: { identifier: true } })).map(
            (session) => session.identifier,
          ),
        );
        assert.ok(
          dataset.manifest.every((session) => sourceIdentifiers.has(session.sessionIdentifier)),
          TrafficSeedMessages.Source,
        );
        const groups: Parameters<typeof SeedSummary.add>[0] = new Map();
        process.stdout.write(
          `Installing ${options.sessions} synthetic sessions into ${options.target} storage\n`,
        );
        const receipt = await TrafficSeedImport.run(source, target, {
          runIdentifier: options.runIdentifier,
          projectSession(graph, ordinal) {
            const projected = TrafficSeedTimeline.project(graph, ordinal, {
              anchor: checkpoint.anchor,
              days: options.days,
              seed: options.seed,
            });
            SeedSummary.add(groups, projected, checkpoint.anchor);

            return projected;
          },
        });
        const report = {
          ...receipt,
          target: options.target,
          anchor: checkpoint.anchor,
          days: options.days,
          trafficOrigin: 'synthetic',
          resumableParticipants: false,
          cohorts: [...groups.values()].sort(
            (left, right) =>
              left.day.localeCompare(right.day) ||
              left.version - right.version ||
              left.variant.localeCompare(right.variant) ||
              left.campaign.localeCompare(right.campaign),
          ),
        };
        await writeFile(
          resolve(options.output, `${options.target}-${TrafficSeedPolicy.ReportFilename}`),
          JSON.stringify(report, null, 2),
          { mode: 0o600 },
        );
        process.stdout.write(`${JSON.stringify(receipt)}\n`);
      } finally {
        await target.$disconnect();
      }
    } finally {
      await source.$disconnect();
    }
  },
} as const;
