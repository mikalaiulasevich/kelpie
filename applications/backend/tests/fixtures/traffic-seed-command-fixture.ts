import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { TrafficSeedCommand } from '../benchmarks/traffic-seed/traffic-seed-command.js';
import { TrafficOracleFixture } from './traffic-oracle/traffic-oracle-fixture.js';
import { BackendApplicationFixture } from './backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from './session-flow.js';
import { TrafficSeedImportPolicy } from '../benchmarks/traffic-seed/traffic-seed-import-policy.js';

export const TrafficSeedCommandFixture = {
  async checkpoint() {
    const output = await mkdtemp(resolve(tmpdir(), 'kelpie-seed-checkpoint-'));
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
      await backend.close();

      throw error;
    }
  },
} as const;
