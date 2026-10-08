import { TrafficQueryPlans } from '../traffic-query-plans.js';
import { TrafficOracle } from '../traffic-oracle/traffic-oracle.js';
import {
  AnalyticsResponseSchemas,
  type AnalyticsResponse,
} from '../../../source/analytics/analytics-response.js';
import { Ajv } from 'ajv';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { BackendApplicationFixture } from '../../fixtures/backend-application.js';
import { TrafficHttp } from '../../fixtures/traffic/traffic-http.js';
import { TrafficSession } from '../../fixtures/traffic/traffic-session.js';
import { AdministrationService } from '../../../source/administration/administration.service.js';
import { TrafficPolicy } from './traffic-policy.js';
import { TrafficMessages } from './traffic-messages.js';
import { TrafficOptionsSchema, type TrafficOptions } from './traffic-types.js';
import type { TrafficSessionManifest } from '../traffic-oracle/traffic-oracle-types.js';

export const TrafficRunner = {
  options(): TrafficOptions {
    const entries = process.argv.slice(2).map((argument) => {
      const separator = argument.indexOf('=');
      const key = argument.slice(2, separator);
      assert.ok(
        argument.startsWith('--') &&
          separator > 2 &&
          ['sessions', 'concurrency', 'seed', 'output'].includes(key),
        TrafficMessages.InvalidArguments,
      );

      return [key, argument.slice(separator + 1)];
    });
    const values = Object.fromEntries(entries);
    const options = {
      sessions: Number(values['sessions'] ?? TrafficPolicy.Sessions),
      concurrency: Number(values['concurrency'] ?? TrafficPolicy.Concurrency),
      seed: Number(values['seed'] ?? TrafficPolicy.Seed),
      output: values['output'] ?? 'test-results/traffic',
    };
    const validate = new Ajv().compile<TrafficOptions>(TrafficOptionsSchema);
    assert.ok(validate(options), TrafficMessages.InvalidArguments);

    return options;
  },

  async run(options: TrafficOptions): Promise<void> {
    process.env['TSX_TSCONFIG_PATH'] = resolve('applications/backend/tsconfig.json');
    const backend = await BackendApplicationFixture.create({
      TRUST_PROXY_LOOPBACK: 'true',
      LOG_LEVEL: 'fatal',
    });

    const http = new TrafficHttp(backend);
    const manifest: TrafficSessionManifest[] = [];

    try {
      await backend
        .getService(AdministrationService)
        .provision(TrafficPolicy.Credentials.username, TrafficPolicy.Credentials.password);
      const signedIn = await http.request('/api/administration/sign-in', TrafficPolicy.Credentials);
      const cookie = signedIn.headers.getSetCookie()[0]?.split(';')[0];
      assert.ok(cookie, TrafficMessages.MissingCookie);
      const versions: string[] = [];

      for (const version of [1, 2, 3]) {
        const document: unknown = JSON.parse(
          await readFile(resolve(`configurations/funnel-v${version}.json`), 'utf8'),
        );
        const imported = await backend.configurationImports.import(document);
        versions.push(imported.version.identifier);
      }

      http.measurements.clear();
      const started = performance.now();
      const processorStarted = process.cpuUsage();
      let peakResidentBytes = process.memoryUsage().rss;
      const sampler = setInterval(() => {
        peakResidentBytes = Math.max(peakResidentBytes, process.memoryUsage().rss);
      }, 100);
      let nextIndex = 0;
      const worker = async () => {
        while (nextIndex < options.sessions) {
          const index = nextIndex;
          nextIndex += 1;
          const version = versions[index % versions.length];
          assert.ok(version, TrafficMessages.MissingVersion);
          manifest.push(await TrafficSession.run(http, cookie, version, index, options.seed));

          if (manifest.length % 100 === 0) {
            process.stdout.write(`${manifest.length}/${options.sessions} synthetic sessions\n`);
          }
        }
      };

      try {
        const results = await Promise.allSettled(
          Array.from({ length: options.concurrency }, worker),
        );
        const errors = results.flatMap((result) =>
          result.status === 'rejected' ? [result.reason] : [],
        );

        if (errors.length > 0) {
          await mkdir(resolve(options.output), { recursive: true });
          await writeFile(
            resolve(options.output, 'failure.json'),
            JSON.stringify(
              {
                completedSessions: manifest.length,
                requestedSessions: options.sessions,
                requests: http.report(),
                failureCount: errors.length,
              },
              null,
              2,
            ),
          );
          throw new AggregateError(errors, TrafficMessages.RequestFailed);
        }
      } finally {
        clearInterval(sampler);
      }

      TrafficOracle.validate(manifest);
      assert.equal(manifest.length, options.sessions);
      assert.equal(await backend.database.session.count(), options.sessions);
      const elapsedMilliseconds = performance.now() - started;
      const processorMicroseconds = process.cpuUsage(processorStarted);
      const traffic = http.report();
      http.measurements.clear();
      const analytics: AnalyticsResponse[] = [];
      const analyticsValidator = new Ajv().compile<AnalyticsResponse>(
        AnalyticsResponseSchemas.Response,
      );

      for (let repeat = 0; repeat < 6; repeat += 1) {
        const response = await http.request(
          '/api/administration/analytics?funnelIdentifier=workstyle-planner&trafficOrigin=synthetic&includeForced=true',
          undefined,
          cookie,
          200000 + repeat,
        );
        const payload: unknown = await response.json();
        assert.ok(analyticsValidator(payload), TrafficMessages.RequestFailed);
        analytics.push(payload);
        TrafficOracle.verify(manifest, payload, { includeForced: true });

        if (repeat === 0) {
          http.measurements.clear();
        }
      }

      const measuredAnalytics = http.report();
      http.measurements.clear();

      for (const versionIdentifier of versions) {
        for (const includeForced of [false, true]) {
          const query = new URLSearchParams({
            funnelIdentifier: 'workstyle-planner',
            trafficOrigin: 'synthetic',
            versionIdentifier,
            includeForced: String(includeForced),
          });
          const response = await http.request(
            `/api/administration/analytics?${query}`,
            undefined,
            cookie,
            250000 + versions.indexOf(versionIdentifier),
          );
          const payload: unknown = await response.json();
          assert.ok(analyticsValidator(payload), TrafficMessages.RequestFailed);
          TrafficOracle.verify(manifest, payload, { versionIdentifier, includeForced });
        }
      }

      for (const campaign of ['synthetic-0', 'synthetic-1', 'synthetic-2']) {
        const query = new URLSearchParams({
          funnelIdentifier: 'workstyle-planner',
          trafficOrigin: 'synthetic',
          campaign,
          includeForced: 'true',
        });
        const payload: unknown = await (
          await http.request(`/api/administration/analytics?${query}`, undefined, cookie, 260000)
        ).json();
        assert.ok(analyticsValidator(payload), TrafficMessages.RequestFailed);
        TrafficOracle.verify(manifest, payload, { campaign, includeForced: true });
      }

      const directory = resolve(options.output);
      await mkdir(directory, { recursive: true });
      manifest.sort((left, right) => left.index - right.index);
      const report = {
        options,
        recordedAt: new Date().toISOString(),
        transport:
          'real HTTP on ephemeral loopback port; isolated temporary SQLite; one simulated proxy IP per session',
        memoryScope:
          'Backend and generator share one process; RSS sampled every 100ms during generation and CPU include both; not isolated backend measurements',
        latencyUnit: 'milliseconds',
        coverage: TrafficOracle.coverage(manifest),
        runtime: { node: process.version, bun: process.versions['bun'] ?? null },
        operatingSystem: `${platform()} ${release()}`,
        processor: cpus()[0]?.model,
        logicalProcessors: cpus().length,
        systemMemoryBytes: totalmem(),
        elapsedMilliseconds,
        sessionsPerSecond: options.sessions / (elapsedMilliseconds / 1000),
        peakResidentBytes,
        processorMicroseconds,
        database: {
          sessions: await backend.database.session.count(),
          events: await backend.database.event.count(),
        },
        networkFailures: http.networkFailures,
        traffic,
        queryPlans: await TrafficQueryPlans.capture(backend, versions),
        oracle: { verified: true, filteredRequests: http.report() },
        analytics: { warmupQueries: 1, measuredQueries: 5, requests: measuredAnalytics },
      };
      await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest));
      await writeFile(
        resolve(directory, 'analytics.json'),
        JSON.stringify(analytics.at(-1), null, 2),
      );
      await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2));
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
      const recovery = await Promise.allSettled([
        (async () => {
          await mkdir(resolve(options.output), { recursive: true });
          await writeFile(
            resolve(options.output, 'failure.json'),
            JSON.stringify(
              {
                status: 'failed',
                options,
                completedSessions: manifest.length,
                networkFailures: http.networkFailures,
                requests: http.report(),
              },
              null,
              2,
            ),
          );
          await writeFile(
            resolve(options.output, 'partial-manifest.json'),
            JSON.stringify(manifest),
          );
        })(),
        backend.close(),
      ]);
      const failures = recovery.flatMap((result) =>
        result.status === 'rejected' ? [result.reason] : [],
      );

      if (failures.length > 0) {
        throw new AggregateError([error, ...failures], TrafficMessages.RequestFailed, { cause: error });
      }

      throw error;
    }

    await backend.close();
  },
} as const;

await TrafficRunner.run(TrafficRunner.options());
