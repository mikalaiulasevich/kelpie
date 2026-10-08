import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { TrafficSeedCommand } from '../benchmarks/traffic-seed/traffic-seed-command.js';
import { TrafficOracleFixture } from './traffic-oracle/traffic-oracle-fixture.js';
import { BackendApplicationFixture } from './backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from './session-flow.js';
import { TrafficSeedImportPolicy } from '../benchmarks/traffic-seed/traffic-seed-import-policy.js';
import { TrafficSeedMessages } from '../benchmarks/traffic-seed/traffic-seed-messages.js';

const SeedFixtureCleanup = {
  async reject(error: unknown, release: () => Promise<void>): Promise<never> {
    try {
      await release();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], TrafficSeedMessages.FixtureCleanupFailed, {
        cause: cleanupError,
      });
    }

    throw error;
  },
} as const;

export const TrafficSeedCommandFixture = {
  async checkpoint(parentDirectory: string = tmpdir()) {
    const output = await mkdtemp(resolve(parentDirectory, 'kelpie-seed-checkpoint-'));

    try {
      const options = TrafficSeedCommand.options([
        '--target=local',
        '--run=test-seed',
        '--sessions=1',
        `--output=${output}`,
      ]);
      const profile = resolve(output, 'profile');
      await mkdir(profile);
      const path = resolve(profile, 'source.sqlite');
      await writeFile(path, 'fixture-bytes');
      const report = {
        retainedDatabase: { path },
        options: { sessions: 1, seed: options.seed },
        oracle: { verified: true },
        database: { sessions: 1, events: 4 },
      };
      await writeFile(resolve(profile, 'report.json'), JSON.stringify(report));
      await writeFile(
        resolve(profile, 'manifest.json'),
        JSON.stringify([TrafficOracleFixture.session()]),
      );

      return { output, profile, options, report, path };
    } catch (error) {
      return SeedFixtureCleanup.reject(error, () => rm(output, { recursive: true, force: true }));
    }
  },

  async timeline() {
    const backend = await BackendApplicationFixture.create();

    try {
      await SessionFlowFixture.prepare(backend);
      const browser = new SessionBrowserFixture(backend);
      const state = await browser.create();
      await SessionFlowFixture.state(
        await browser.post('/current/continue', SessionFlowFixture.command(state)),
      );
      const graph = await backend.database.session.findUniqueOrThrow({
        where: { identifier: state.sessionIdentifier },
        include: TrafficSeedImportPolicy.Include,
      });

      return { backend, graph };
    } catch (error) {
      return SeedFixtureCleanup.reject(error, () => backend.close());
    }
  },

  async target() {
    const checkpoint = await TrafficSeedCommandFixture.checkpoint();
    const timeline = await TrafficSeedCommandFixture.timeline().catch((error: unknown) =>
      SeedFixtureCleanup.reject(error, () =>
        rm(checkpoint.output, { recursive: true, force: true }),
      ),
    );

    return {
      ...checkpoint,
      ...timeline,
      async close(): Promise<void> {
        const results = await Promise.allSettled([
          timeline.backend.close(),
          rm(checkpoint.output, { recursive: true, force: true }),
        ]);
        const errors = results.flatMap((result) =>
          result.status === 'rejected' ? [result.reason] : [],
        );

        if (errors.length > 0) {
          throw new AggregateError(errors, TrafficSeedMessages.TargetFixtureCleanupFailed);
        }
      },
    };
  },
} as const;
