import { applicationDirectory } from '../../../source/application/application-directory.js';
import { TrafficProfileDatabase } from '../traffic-profile-database.js';
import { TrafficQueryPlans } from '../traffic-query-plans.js';
import { TrafficOracle } from '../traffic-oracle/traffic-oracle.js';
import {
  AnalyticsResponseSchemas,
  type AnalyticsResponse,
} from '../../../source/analytics/analytics-response.js';
import { FunnelConfigurations } from '@kelpie/contracts';
import type { TrafficCoverageSpecification } from '../traffic-oracle/traffic-oracle-types.js';
import { isUndefined } from 'es-toolkit/predicate';
import {
  TrafficGenerationCheckpointSchema,
  type TrafficGenerationCheckpoint,
} from './traffic-types.js';
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

interface TrafficPreparedProfile {
  cookie: string;
  versions: string[];
  specifications: TrafficCoverageSpecification[];
}

interface TrafficAnalyticsMeasurement {
  response: Optional<AnalyticsResponse>;
  measuredAnalytics: ReturnType<TrafficHttp['report']>;
}

export class TrafficProfile {
  readonly http: TrafficHttp;

  readonly manifest: TrafficSessionManifest[] = [];

  private snapshot: Optional<Awaited<ReturnType<typeof TrafficProfileDatabase.snapshot>>>;

  constructor(
    readonly backend: BackendApplicationFixture,
    readonly options: TrafficOptions,
  ) {
    this.http = new TrafficHttp(backend);
  }

  async execute(): Promise<void> {
    try {
      process.stdout.write('Traffic profile: preparing isolated backend\n');
      const prepared = await this.prepare();
      const load = isUndefined(this.options.resume)
        ? { measurement: await this.generate(prepared), provenance: this.provenance() }
        : await this.restore(this.options.resume);
      process.stdout.write('Traffic profile: saving generation checkpoint\n');
      await this.checkpoint(load);
      this.snapshot = await TrafficProfileDatabase.snapshot(this.backend, this.options.output);
      await this.checkCoverage(prepared.specifications);
      const analytics = await this.measureAnalytics(prepared.cookie);
      await this.analyticsCheckpoint(analytics);
      await this.verifyFilters(prepared);
      await this.save(prepared, load, analytics);
    } catch (error) {
      await this.recover(error);
    }

    await this.backend.close();
  }

  private async checkpoint(load: TrafficGenerationCheckpoint): Promise<void> {
    const directory = resolve(this.options.output);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(this.manifest));
    await writeFile(resolve(directory, 'generation.json'), JSON.stringify(load, null, 2));
  }

  private async analyticsCheckpoint(analytics: TrafficAnalyticsMeasurement): Promise<void> {
    assert.ok(analytics.response, TrafficMessages.RequestFailed);
    const directory = resolve(this.options.output);
    await Promise.all([
      writeFile(resolve(directory, 'analytics.json'), JSON.stringify(analytics.response, null, 2)),
      writeFile(
        resolve(directory, 'analytics-measurement.json'),
        JSON.stringify(
          {
            recordedAt: new Date().toISOString(),
            runtime: { node: process.version, bun: process.versions['bun'] ?? null },
            warmupQueries: 1,
            measuredQueries: 5,
            requests: analytics.measuredAnalytics,
          },
          null,
          2,
        ),
      ),
    ]);
    process.stdout.write('Traffic profile: global analytics checkpoint saved\n');
  }

  private async restore(directory: string): Promise<TrafficGenerationCheckpoint> {
    const manifest: unknown = JSON.parse(
      await readFile(resolve(directory, 'manifest.json'), 'utf8'),
    );
    this.manifest.push(...TrafficOracle.validate(manifest));
    assert.equal(this.manifest.length, this.options.sessions, TrafficMessages.InvalidArguments);
    const load: unknown = JSON.parse(await readFile(resolve(directory, 'generation.json'), 'utf8'));

    const validate = new Ajv().compile<TrafficGenerationCheckpoint>(
      TrafficGenerationCheckpointSchema,
    );
    assert.ok(validate(load), TrafficMessages.InvalidArguments);
    assert.equal(
      load.provenance.options.sessions,
      this.options.sessions,
      TrafficMessages.InvalidArguments,
    );
    assert.equal(load.provenance.options.seed, this.options.seed, TrafficMessages.InvalidArguments);
    assert.equal(
      load.provenance.options.concurrency,
      this.options.concurrency,
      TrafficMessages.InvalidArguments,
    );

    const sessions = await this.backend.database.session.findMany({ select: { identifier: true } });
    const identifiers = new Set(sessions.map((session) => session.identifier));
    assert.equal(identifiers.size, this.manifest.length, TrafficMessages.InvalidArguments);
    assert.ok(
      this.manifest.every((session) => identifiers.has(session.sessionIdentifier)),
      TrafficMessages.InvalidArguments,
    );

    return load;
  }

  private provenance() {
    return {
      options: this.options,
      recordedAt: new Date().toISOString(),
      nodeRuntime: process.version,
      bunRuntime: process.versions['bun'] ?? null,
      operatingSystem: `${platform()} ${release()}`,
      processor: cpus()[0]?.model ?? 'unknown',
      logicalProcessors: cpus().length,
      systemMemoryBytes: totalmem(),
    };
  }

  private async prepare() {
    const { backend, http } = this;
    await backend
      .getService(AdministrationService)
      .provision(TrafficPolicy.Credentials.username, TrafficPolicy.Credentials.password);
    const signedIn = await http.request('/api/administration/sign-in', TrafficPolicy.Credentials);
    const cookie = signedIn.headers.getSetCookie()[0]?.split(';')[0];
    assert.ok(cookie, TrafficMessages.MissingCookie);
    const versions: string[] = [];
    const specifications: TrafficCoverageSpecification[] = [];

    for (const version of [1, 2, 3]) {
      const document: unknown = JSON.parse(
        await readFile(
          resolve(
            this.options.configurationDirectory ??
              resolve(applicationDirectory, '../../configurations'),
            `funnel-v${version}.json`,
          ),
          'utf8',
        ),
      );
      const validation = FunnelConfigurations.validate(document);
      assert.ok(validation.valid, TrafficMessages.MissingVersion);
      specifications.push({
        version,
        variants: ['A', 'B'],
        resultIdentifiers: Object.keys(validation.configuration.results),
        conditionalStepIdentifiers: Object.values(validation.configuration.steps)
          .filter((step) => step.visibleWhen)
          .map((step) => step.id),
      });
      const imported = await backend.configurationImports.import(document);
      versions.push(imported.version.identifier);
    }

    return { cookie, versions, specifications };
  }

  private async generate(prepared: TrafficPreparedProfile) {
    const { http, manifest, options } = this;
    const { cookie, versions } = prepared;
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
      const results = await Promise.allSettled(Array.from({ length: options.concurrency }, worker));
      const errors = results.flatMap((result) =>
        result.status === 'rejected' ? [result.reason] : [],
      );

      if (errors.length > 0) {
        throw new AggregateError(errors, TrafficMessages.RequestFailed);
      }
    } finally {
      clearInterval(sampler);
    }

    const elapsedMilliseconds = performance.now() - started;
    const processorMicroseconds = process.cpuUsage(processorStarted);
    const traffic = http.report();
    http.measurements.clear();

    return { elapsedMilliseconds, processorMicroseconds, peakResidentBytes, traffic };
  }

  private async checkCoverage(specifications: TrafficCoverageSpecification[]) {
    const { backend, manifest, options } = this;
    TrafficOracle.validate(manifest);
    assert.equal(manifest.length, options.sessions);

    if (options.sessions >= 10000) {
      TrafficOracle.verifyCoverage(manifest, specifications);
    }

    assert.equal(await backend.database.session.count(), options.sessions);
  }

  private async measureAnalytics(cookie: string) {
    const { http, manifest } = this;
    const analytics: AnalyticsResponse[] = [];
    const analyticsValidator = new Ajv().compile<AnalyticsResponse>(
      AnalyticsResponseSchemas.Response,
    );

    for (let repeat = 0; repeat < 6; repeat += 1) {
      process.stdout.write(`Traffic profile: global analytics query ${repeat + 1}/6\n`);
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

    return { response: analytics.at(-1), measuredAnalytics };
  }

  private async verifyFilters(prepared: TrafficPreparedProfile) {
    const { http, manifest } = this;
    const { versions, cookie } = prepared;
    const analyticsValidator = new Ajv().compile<AnalyticsResponse>(
      AnalyticsResponseSchemas.Response,
    );

    for (const versionIdentifier of versions) {
      for (const includeForced of [false, true]) {
        process.stdout.write(
          `Traffic profile: version ${versions.indexOf(versionIdentifier) + 1} analytics, includeForced=${includeForced}\n`,
        );
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

    for (const campaign of [...new Set(manifest.map((session) => session.acquisition.campaign))]) {
      process.stdout.write(`Traffic profile: analytics campaign ${campaign}\n`);
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
  }

  private async save(
    prepared: TrafficPreparedProfile,
    generation: TrafficGenerationCheckpoint,
    analytics: TrafficAnalyticsMeasurement,
  ) {
    const { backend, http, manifest, options } = this;
    const { versions } = prepared;
    const { elapsedMilliseconds, processorMicroseconds, peakResidentBytes, traffic } =
      generation.measurement;
    const { measuredAnalytics } = analytics;
    const directory = resolve(options.output);
    await mkdir(directory, { recursive: true });
    manifest.sort((left, right) => left.index - right.index);
    const report = {
      options,
      retainedDatabase: this.snapshot,
      recordedAt: new Date().toISOString(),
      transport:
        'real HTTP on ephemeral loopback port; isolated temporary SQLite; one simulated proxy IP per session',
      memoryScope:
        'Generation RSS and CPU include backend and generator; RSS sampled every 100ms. Original generation environment is recorded in generationProvenance; current runtime describes this analytics profiling execution.',
      latencyUnit: 'milliseconds',
      coverage: TrafficOracle.coverage(manifest),
      coverageGate: options.sessions >= 10000 ? 'passed' : 'small-sample-not-required',
      runtime: { node: process.version, bun: process.versions['bun'] ?? null },
      operatingSystem: `${platform()} ${release()}`,
      processor: cpus()[0]?.model,
      logicalProcessors: cpus().length,
      systemMemoryBytes: totalmem(),
      elapsedMilliseconds,
      sessionsPerSecond: options.sessions / (elapsedMilliseconds / 1000),
      generationProvenance: generation.provenance,
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
    await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }

  private async recover(error: unknown): Promise<never> {
    const { backend, http, manifest, options } = this;
    const recovery = await Promise.allSettled([
      (async () => {
        await mkdir(resolve(options.output), { recursive: true });
        await writeFile(
          resolve(options.output, 'failure.json'),
          JSON.stringify(
            {
              status: 'failed',
              retainedDatabase: this.snapshot,
              options,
              completedSessions: manifest.length,
              networkFailures: http.networkFailures,
              requests: http.report(),
            },
            null,
            2,
          ),
        );
        await writeFile(resolve(options.output, 'partial-manifest.json'), JSON.stringify(manifest));
      })(),
      backend.close(),
    ]);
    const failures = recovery.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    );

    if (failures.length > 0) {
      throw new AggregateError([error, ...failures], TrafficMessages.RequestFailed, {
        cause: error,
      });
    }

    throw error;
  }
}

export const TrafficRunner = {
  options(arguments_: readonly string[] = process.argv.slice(2)): TrafficOptions {
    const entries = arguments_.map((argument) => {
      const separator = argument.indexOf('=');
      const key = argument.slice(2, separator);
      assert.ok(
        argument.startsWith('--') &&
          separator > 2 &&
          ['sessions', 'concurrency', 'seed', 'output', 'resume', 'database'].includes(key),
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
      ...(isUndefined(values['resume']) ? {} : { resume: values['resume'] }),
      ...(isUndefined(values['database']) ? {} : { database: values['database'] }),
    };
    const validate = new Ajv().compile<TrafficOptions>(TrafficOptionsSchema);
    assert.ok(validate(options), TrafficMessages.InvalidArguments);
    assert.equal(
      isUndefined(options.resume),
      isUndefined(options.database),
      TrafficMessages.InvalidArguments,
    );

    return options;
  },

  async run(options: TrafficOptions): Promise<void> {
    process.env['TSX_TSCONFIG_PATH'] = resolve(applicationDirectory, 'tsconfig.json');
    const environment = { TRUST_PROXY_LOOPBACK: 'true', LOG_LEVEL: 'fatal' };
    const backend = isUndefined(options.database)
      ? await BackendApplicationFixture.create(environment)
      : await BackendApplicationFixture.createFromSnapshot(resolve(options.database), environment);
    await new TrafficProfile(backend, options).execute();
  },
} as const;
