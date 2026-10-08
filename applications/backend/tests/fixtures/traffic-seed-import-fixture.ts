import assert from 'node:assert/strict';
import { StepType } from '@kelpie/contracts';
import { Prisma } from '../../generated/prisma/client.js';
import { SessionProjection } from '../../source/sessions/session-projection.js';
import { SessionSnapshots } from '../../source/sessions/session-snapshots.js';
import { TrafficSeedImportPolicy } from '../benchmarks/traffic-seed/traffic-seed-import-policy.js';
import { BackendApplicationFixture } from './backend-application.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';
import type { TrafficSeedSessionGraph } from '../benchmarks/traffic-seed/traffic-seed-import-types.js';

const ImportFixtureCleanup = {
  async reject(error: unknown, resources: readonly BackendApplicationFixture[]): Promise<never> {
    const results = await Promise.allSettled(resources.map((resource) => resource.close()));
    const failures = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    );

    if (failures.length > 0) {
      throw new AggregateError([error, ...failures], 'Synthetic import fixture cleanup failed.', {
        cause: error,
      });
    }

    throw error;
  },
} as const;

export const TrafficSeedImportFixture = {
  projectSession(session: TrafficSeedSessionGraph) {
    return session;
  },

  async saveReplay(source: BackendApplicationFixture, compact = true): Promise<void> {
    const graph = await source.database.session.findUniqueOrThrow({
      where: { identifier: 'source-session' },
      include: TrafficSeedImportPolicy.Include,
    });
    const state = SessionProjection.read(graph);
    const response = compact ? SessionSnapshots.json(state) : state;

    await source.database.$executeRaw(Prisma.sql`
      UPDATE SessionOperation SET response = ${JSON.stringify(response)}
      WHERE sessionIdentifier = ${graph.identifier}
    `);
  },

  async create() {
    const source = await BackendApplicationFixture.create();

    const target = await BackendApplicationFixture.create().catch((error: unknown) =>
      ImportFixtureCleanup.reject(error, [source]),
    );

    try {
      const configuration = ConfigurationImportFixtures.original(1);
      const workMode = configuration.steps['work_mode'];
      assert.ok(workMode?.type === StepType.SingleSelect);
      const document = {
        ...configuration,
        description: 'source-session',
        steps: {
          ...configuration.steps,
          work_mode: {
            ...workMode,
            input: {
              ...workMode.input,
              options: [
                ...workMode.input.options,
                { value: 'yes', label: 'Fixture selection' },
                { value: 'source-operation', label: 'Identifier-shaped selection' },
              ],
            },
          },
        },
      };
      const version = await source.configurationImports.import(document);
      await target.configurationImports.import(document);
      const timestamp = new Date('2026-10-01T12:00:00Z');
      const session = await source.database.session.create({
        data: {
          identifier: 'source-session',
          accessTokenHash: 'never-copy-token',
          versionIdentifier: version.version.identifier,
          experimentIdentifier: 'experiment',
          variant: 'A',
          assignmentSource: 'random',
          trafficOrigin: 'synthetic',
          acquisitionParameters: { utm_source: 'search' },
          campaign: 'autumn',
          currentStepIdentifier: 'intro',
          revision: 1,
          initialState: { secret: 'never-copy-initial' },
          createdAt: timestamp,
          expiresAt: timestamp,
          answers: { create: { stepIdentifier: 'work_mode', value: 'yes', updatedAt: timestamp } },
          operations: {
            create: {
              operationIdentifier: 'source-operation',
              requestFingerprint: 'fingerprint',
              response: {
                sessionIdentifier: 'source-session',
                versionIdentifier: version.version.identifier,
              },
              createdAt: timestamp,
            },
          },
          events: {
            create: {
              identifier: 'source-event',
              contentFingerprint: 'fingerprint',
              name: 'session_started',
              source: 'server',
              clientTimestamp: timestamp,
              serverTimestamp: timestamp,
              properties: {},
            },
          },
        },
      });
      await source.database.sessionTransition.create({
        data: {
          identifier: 'source-transition',
          sessionIdentifier: session.identifier,
          operationIdentifier: 'source-operation',
          revision: 1,
          kind: 'continue',
          fromStepIdentifier: 'intro',
          toStepIdentifier: 'work_mode',
          createdAt: timestamp,
        },
      });

      await TrafficSeedImportFixture.saveReplay(source);

      return { source, target };
    } catch (error) {
      return ImportFixtureCleanup.reject(error, [target, source]);
    }
  },
} as const;
