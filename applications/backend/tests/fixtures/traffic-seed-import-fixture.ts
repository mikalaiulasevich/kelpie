import { BackendApplicationFixture } from './backend-application.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';
import type { TrafficSeedSessionGraph } from '../benchmarks/traffic-seed/traffic-seed-import-types.js';

export const TrafficSeedImportFixture = {
  projectSession(session: TrafficSeedSessionGraph) {
    return session;
  },

  async create() {
    const source = await BackendApplicationFixture.create();

    try {
      const target = await BackendApplicationFixture.create();

      try {
        const document = ConfigurationImportFixtures.original(1);
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
            currentStepIdentifier: 'welcome',
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
