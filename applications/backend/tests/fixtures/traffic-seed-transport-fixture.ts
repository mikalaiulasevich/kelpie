import { omit } from 'es-toolkit';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ApplicationEnvironmentService } from '../../source/environment/application-environment.js';
import { TrafficSeedLibsqlTransport } from '../benchmarks/traffic-seed/traffic-seed-libsql-transport.js';
import { TrafficSeedImportFixture } from './traffic-seed-import-fixture.js';
import type { BackendApplicationFixture } from './backend-application.js';

export const TrafficSeedTransportFixture = {
  async multipleRequests(source: BackendApplicationFixture): Promise<void> {
    const event = await source.database.event.findFirstOrThrow();
    const properties = { payload: 'x'.repeat(5000) };
    await source.database.event.createMany({
      data: Array.from({ length: 300 }, (_, index) => ({
        ...event,
        identifier: `bulk-event-${index}`,
        properties,
      })),
    });
  },

  async independentGraphs(source: BackendApplicationFixture): Promise<void> {
    const session = await source.database.session.findFirstOrThrow();
    const event = await source.database.event.findFirstOrThrow();
    const properties = { payload: 'x'.repeat(600_000) };
    await source.database.event.updateMany({ data: { properties } });
    await source.database.session.create({
      data: {
        ...omit(session, ['acquisitionParameters', 'initialState']),
        identifier: 'second-session',
        accessTokenHash: null,
        acquisitionParameters: {},
      },
    });
    await source.database.event.create({
      data: {
        ...event,
        identifier: 'second-event',
        sessionIdentifier: 'second-session',
        properties,
      },
    });
  },

  async create() {
    const fixture = await TrafficSeedImportFixture.create();
    const transport = new TrafficSeedLibsqlTransport({
      url: fixture.target.getService(ApplicationEnvironmentService).values.databaseUrl,
    });
    const database = new PrismaClient({ adapter: transport });

    return { ...fixture, transport, database };
  },
} as const;
