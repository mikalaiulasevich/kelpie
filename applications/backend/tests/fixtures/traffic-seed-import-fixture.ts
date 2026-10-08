import { Prisma } from '../../generated/prisma/client.js';
import { SessionProjection } from '../../source/sessions/session-projection.js';
import { SessionSnapshots } from '../../source/sessions/session-snapshots.js';
import { TrafficSeedImportPolicy } from '../benchmarks/traffic-seed/traffic-seed-import-policy.js';
import { BackendApplicationFixture } from './backend-application.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';
import type { TrafficSeedSessionGraph } from '../benchmarks/traffic-seed/traffic-seed-import-types.js';

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

    try {
      const target = await BackendApplicationFixture.create();

      try {
        const document = { ...ConfigurationImportFixtures.original(1), description: 'source-session' };
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
            answers: { create: { stepIdentifier: 'question', value: 'yes', updatedAt: timestamp } },
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
            fromStepIdentifier: 'welcome',
            toStepIdentifier: 'question',
            createdAt: timestamp,
          },
        });

        await TrafficSeedImportFixture.saveReplay(source);

        return { source, target };
      } catch (error) {
        await target.close();

        throw error;
      }
    } catch (error) {
      await source.close();

      throw error;
    }
  },
} as const;
