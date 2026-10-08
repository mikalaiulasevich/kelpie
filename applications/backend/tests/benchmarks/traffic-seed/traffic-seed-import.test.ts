import { SessionSnapshots } from '../../../source/sessions/session-snapshots.js';
import { describe, expect, it } from 'vitest';
import { TrafficSeedReplayCases } from '../../cases/traffic-seed/traffic-seed-replay-cases.js';
import { TrafficSeedImportFixture } from '../../fixtures/traffic-seed-import-fixture.js';
import { TrafficSeedImport } from './traffic-seed-import.js';
import { TrafficSeedImportPolicy } from './traffic-seed-import-policy.js';

describe('synthetic dataset import', () => {
  it('copies history without credentials, maps identifiers and rejects conflicting retries', async () => {
    const { source, target } = await TrafficSeedImportFixture.create();
    const options = {
      runIdentifier: 'test-run',
      projectSession: TrafficSeedImportFixture.projectSession,
    };

    try {
      const before = await target.database.funnel.findMany();
      expect(await TrafficSeedImport.run(source.database, target.database, options)).toMatchObject({
        inserted: 1,
        existing: 0,
        events: 1,
      });
      const graph = await target.database.session.findFirstOrThrow({
        include: TrafficSeedImportPolicy.Include,
      });
      expect(graph.accessTokenHash).toBeNull();
      expect(graph.initialState).toBeNull();
      expect(graph.identifier).not.toBe('source-session');
      expect(SessionSnapshots.read(graph.operations[0]?.response, graph)).toMatchObject({
        sessionIdentifier: graph.identifier,
        versionIdentifier: graph.versionIdentifier,
      });
      expect(graph.answers).toHaveLength(1);
      expect(graph.transitions).toHaveLength(1);
      expect(await target.database.funnel.findMany()).toEqual(before);
      expect(await target.database.administrator.count()).toBe(0);
      expect(await TrafficSeedImport.run(source.database, target.database, options)).toMatchObject({
        inserted: 0,
        existing: 1,
      });

      await source.database.sessionAnswer.update({
        where: {
          sessionIdentifier_stepIdentifier: {
            sessionIdentifier: 'source-session',
            stepIdentifier: 'question',
          },
        },
        data: { value: 'conflicting' },
      });
      await expect(
        TrafficSeedImport.run(source.database, target.database, options),
      ).rejects.toThrow('conflicts');
      expect(await target.database.session.count()).toBe(1);
      expect((await target.database.sessionAnswer.findFirstOrThrow()).value).toBe('yes');
    } finally {
      await Promise.all([source.close(), target.close()]);
    }
  });

  it.each(TrafficSeedReplayCases)(
    'preserves configuration prose, answers and event metadata in $name snapshots',
    async ({ compact }) => {
      const { source, target } = await TrafficSeedImportFixture.create();

      try {
        const original = await source.database.session.findFirstOrThrow({
          include: TrafficSeedImportPolicy.Include,
        });
        const properties = {
          description: 'source-session',
          value: 'source-operation',
          version: original.versionIdentifier,
        };
        await source.database.sessionAnswer.updateMany({ data: { value: 'source-operation' } });
        await source.database.event.updateMany({ data: { properties } });
        await TrafficSeedImportFixture.saveReplay(source, compact);
        await TrafficSeedImport.run(source.database, target.database, {
          runIdentifier: 'preserved-data',
          projectSession: TrafficSeedImportFixture.projectSession,
        });
        const imported = await target.database.session.findFirstOrThrow({
          include: TrafficSeedImportPolicy.Include,
        });
        const response = imported.operations[0]?.response;
        const state = SessionSnapshots.read(response, imported);

        expect(SessionSnapshots.isCompact(response)).toBe(compact);
        expect(state.sessionIdentifier).toBe(imported.identifier);
        expect(state.versionIdentifier).toBe(imported.versionIdentifier);
        expect(imported.identifier).not.toBe(original.identifier);
        expect(imported.versionIdentifier).not.toBe(original.versionIdentifier);
        expect(state.configuration.description).toBe('source-session');
        expect(state.answers).toEqual([
          { stepIdentifier: 'question', value: 'source-operation', confirmationRevision: null },
        ]);
        expect(imported.answers[0]?.value).toBe('source-operation');
        expect(imported.events[0]?.properties).toEqual(properties);
        expect(state.configuration).toEqual(SessionSnapshots.read(
          (await source.database.sessionOperation.findFirstOrThrow()).response,
          await source.database.session.findFirstOrThrow({ include: TrafficSeedImportPolicy.Include }),
        ).configuration);
      } finally {
        await Promise.all([source.close(), target.close()]);
      }
    },
  );

  it('rejects malformed replay state before writing any imported records', async () => {
    const { source, target } = await TrafficSeedImportFixture.create();

    try {
      await source.database.sessionOperation.updateMany({ data: { response: { invalid: true } } });
      await expect(TrafficSeedImport.run(source.database, target.database, {
        runIdentifier: 'invalid-replay',
        projectSession: TrafficSeedImportFixture.projectSession,
      })).rejects.toThrow();
      expect(await target.database.session.count()).toBe(0);
      expect(await target.database.sessionOperation.count()).toBe(0);
    } finally {
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('rolls back the whole batch when a child foreign key fails and can retry afterward', async () => {
    const { source, target } = await TrafficSeedImportFixture.create();

    try {
      await expect(
        TrafficSeedImport.run(source.database, target.database, {
          runIdentifier: 'rollback-run',
          projectSession(graph) {
            return {
              ...graph,
              transitions: graph.transitions.map((transition) => ({
                ...transition,
                operationIdentifier: 'missing-operation',
              })),
            };
          },
        }),
      ).rejects.toThrow();
      expect(await target.database.session.count()).toBe(0);
      expect(await target.database.sessionAnswer.count()).toBe(0);
      expect(await target.database.sessionOperation.count()).toBe(0);
      expect(
        await TrafficSeedImport.run(source.database, target.database, {
          runIdentifier: 'rollback-run',
          projectSession: TrafficSeedImportFixture.projectSession,
        }),
      ).toMatchObject({ inserted: 1 });
    } finally {
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('rejects non-synthetic source records before writing', async () => {
    const { source, target } = await TrafficSeedImportFixture.create();

    try {
      await source.database.session.update({
        where: { identifier: 'source-session' },
        data: { trafficOrigin: 'production' },
      });
      await expect(
        TrafficSeedImport.run(source.database, target.database, {
          runIdentifier: 'guard-run',
          projectSession: TrafficSeedImportFixture.projectSession,
        }),
      ).rejects.toThrow('real traffic');
      expect(await target.database.session.count()).toBe(0);
    } finally {
      await Promise.all([source.close(), target.close()]);
    }
  });

  it('rejects a target configuration checksum mismatch before writing', async () => {
    const { source, target } = await TrafficSeedImportFixture.create();

    try {
      await target.database.funnelVersion.updateMany({ data: { checksum: 'different-document' } });
      await expect(
        TrafficSeedImport.run(source.database, target.database, {
          runIdentifier: 'version-run',
          projectSession: TrafficSeedImportFixture.projectSession,
        }),
      ).rejects.toThrow('exact configuration');
      expect(await target.database.session.count()).toBe(0);
    } finally {
      await Promise.all([source.close(), target.close()]);
    }
  });
});
