import { TrafficSeedRetryFixture } from '../../fixtures/traffic-seed-retry-fixture.js';
import { describe, expect, it, vi } from 'vitest';
import { TrafficSeedTransportFixture } from '../../fixtures/traffic-seed-transport-fixture.js';
import { TrafficSeedImportFixture } from '../../fixtures/traffic-seed-import-fixture.js';
import { TrafficSeedImport } from './traffic-seed-import.js';
import type { TrafficSeedSessionGraph } from './traffic-seed-import-types.js';
import { TrafficSeedImportPolicy } from './traffic-seed-import-policy.js';
import { TrafficSeedStatements } from './traffic-seed-statements.js';
import { TrafficSeedTransportPolicy } from './traffic-seed-transport-policy.js';

describe('batched libSQL synthetic import transport', () => {
  it('avoids interactive transactions and reports committed verification mismatches without overwriting them', async () => {
    const { source, target, transport, database } = await TrafficSeedTransportFixture.create();
    const transactions = vi.spyOn(database, '$transaction');
    const options = {
      runIdentifier: 'postcommit-mismatch',
      projectSession: TrafficSeedImportFixture.projectSession,
      prepareGraphs(graphs: readonly TrafficSeedSessionGraph[]) {
        expect(transactions).not.toHaveBeenCalled();
        const write = transport.prepareGraphs(
          graphs.map((graph) => ({ ...graph, campaign: 'unexpected-committed-content' })),
        );

        return async () => {
          expect(transactions).not.toHaveBeenCalled();
          await write();
        };
      },
    };

    try {
      await expect(TrafficSeedImport.run(source.database, database, options)).rejects.toThrow(
        'conflicts',
      );
      expect(await database.session.count()).toBe(1);
      expect((await database.session.findFirstOrThrow()).campaign).toBe(
        'unexpected-committed-content',
      );
      await expect(TrafficSeedImport.run(source.database, database, options)).rejects.toThrow(
        'conflicts',
      );
      expect(transactions).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
      await database.$disconnect();
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('commits bound payloads through native atomic batches and preserves verified retries', async () => {
    const fixture = await TrafficSeedTransportFixture.create();
    const { source, target, transport, database } = fixture;
    const properties = { text: "'); DROP TABLE Session; --" };
    const options = {
      runIdentifier: 'transport-success',
      projectSession: TrafficSeedImportFixture.projectSession,
      prepareGraphs: (graphs: readonly TrafficSeedSessionGraph[]) =>
        transport.prepareGraphs(graphs),
    };

    try {
      await source.database.event.updateMany({ data: { properties } });
      await expect(transport.prepareGraphs([])()).rejects.toThrow('connected database client');
      expect(await TrafficSeedImport.run(source.database, database, options)).toMatchObject({
        inserted: 1,
        events: 1,
      });
      expect((await database.event.findFirstOrThrow()).properties).toEqual(properties);
      expect(await TrafficSeedImport.run(source.database, database, options)).toMatchObject({
        inserted: 0,
        existing: 1,
      });
      expect(await database.session.count()).toBe(1);
      expect(await database.sessionTransition.count()).toBe(1);
      await database.$disconnect();
      await expect(transport.prepareGraphs([])()).rejects.toThrow('connected database client');
    } finally {
      await database.$disconnect();
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('rolls back preceding batch statements on foreign-key failure and releases the transaction for retry', async () => {
    const { source, target, transport, database } = await TrafficSeedTransportFixture.create();
    const prepareGraphs = (graphs: readonly TrafficSeedSessionGraph[]) =>
      transport.prepareGraphs(graphs);

    try {
      await expect(
        TrafficSeedImport.run(source.database, database, {
          runIdentifier: 'transport-rollback',
          projectSession: TrafficSeedImportFixture.projectSession,
          prepareGraphs(graphs) {
            return transport.prepareGraphs(
              graphs.map((graph) => ({
                ...graph,
                events: graph.events.map((event, index) =>
                  index === graph.events.length - 1
                    ? { ...event, sessionIdentifier: 'missing-owner' }
                    : event,
                ),
              })),
            );
          },
        }),
      ).rejects.toThrow();
      expect(await database.session.count()).toBe(0);
      expect(await database.sessionAnswer.count()).toBe(0);
      expect(await database.sessionOperation.count()).toBe(0);
      expect(await database.event.count()).toBe(0);
      expect(
        await TrafficSeedImport.run(source.database, database, {
          runIdentifier: 'transport-rollback',
          prepareGraphs,
          projectSession: TrafficSeedImportFixture.projectSession,
        }),
      ).toMatchObject({ inserted: 1 });
      expect(await database.event.count()).toBe(1);
    } finally {
      await database.$disconnect();
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('resumes whole-graph atomic subgroups after a committed request loses its acknowledgement', async () => {
    const { source, target, transport, database } = await TrafficSeedTransportFixture.create();
    const create = transport.createClient.bind(transport);
    const batches = vi.fn();
    vi.spyOn(transport, 'createClient').mockImplementation((configuration) => {
      const client = create(configuration);
      const batch = client.batch.bind(client);
      vi.spyOn(client, 'batch').mockImplementation(async (statements, mode) => {
        batches(statements, mode);
        const results = await batch(statements, mode);

        if (batches.mock.calls.length === 1) {
          throw TrafficSeedRetryFixture.closed();
        }

        return results;
      });

      return client;
    });

    try {
      await TrafficSeedTransportFixture.independentGraphs(source);
      const receipt = await TrafficSeedImport.run(source.database, database, {
        runIdentifier: 'atomic-subgroups',
        projectSession: TrafficSeedImportFixture.projectSession,
        prepareGraphs: (graphs) => transport.prepareGraphs(graphs),
      });
      expect(receipt).toMatchObject({ sessions: 2, inserted: 1, existing: 1, events: 2 });
      expect(batches).toHaveBeenCalledTimes(2);
      expect(batches.mock.calls.every(([, mode]) => mode === 'write')).toBe(true);
      expect(await database.session.count()).toBe(2);
      expect(await database.event.count()).toBe(2);
      expect(await database.sessionOperation.count()).toBe(1);
    } finally {
      vi.restoreAllMocks();
      await database.$disconnect();
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('rejects an oversized whole graph before any target writes', async () => {
    const { source, target, transport, database } = await TrafficSeedTransportFixture.create();

    try {
      await TrafficSeedTransportFixture.multipleRequests(source);
      const graph = await source.database.session.findFirstOrThrow({
        include: TrafficSeedImportPolicy.Include,
      });
      expect(
        TrafficSeedStatements.create([graph]).reduce(
          (total, statement) => total + statement.bytes,
          0,
        ),
      ).toBeGreaterThan(TrafficSeedTransportPolicy.MaximumRequestBytes);
      expect(() =>
        transport.prepareGraphs([{ ...graph, events: graph.events.slice(0, 1) }, graph]),
      ).toThrow('session graph exceeds');
      expect(await database.session.count()).toBe(0);
    } finally {
      await database.$disconnect();
      await Promise.all([source.close(), target.close()]);
    }
  });
});
