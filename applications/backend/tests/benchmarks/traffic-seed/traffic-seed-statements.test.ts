import { describe, expect, it } from 'vitest';
import { TrafficSeedImportFixture } from '../../fixtures/traffic-seed-import-fixture.js';
import { TrafficSeedTransportFixture } from '../../fixtures/traffic-seed-transport-fixture.js';
import { TrafficSeedImportPolicy } from './traffic-seed-import-policy.js';
import { TrafficSeedStatements } from './traffic-seed-statements.js';

describe('dual bounded seed statements', () => {
  it('splits independently at byte and lower bind limits while measuring escaped UTF-8 exactly', async () => {
    const { source, target } = await TrafficSeedImportFixture.create();

    try {
      await TrafficSeedTransportFixture.multipleRequests(source);
      const original = await source.database.session.findFirstOrThrow({
        include: TrafficSeedImportPolicy.Include,
      });
      const graph = {
        ...original,
        events: original.events.map((event) => ({
          ...event,
          properties: { text: '"\n😀'.repeat(1250) },
        })),
      };
      const byteBounded = TrafficSeedStatements.create([graph]);
      const bindBounded = TrafficSeedStatements.create([graph], 99);
      const eventStatements = byteBounded.filter(({ statement }) =>
        statement.sql.startsWith('INSERT INTO "Event"'),
      );
      expect(eventStatements.length).toBeGreaterThan(1);
      expect(bindBounded.length).toBeGreaterThan(byteBounded.length);
      expect(bindBounded.every(({ statement }) => statement.args.length <= 99)).toBe(true);
      expect(byteBounded.every(({ statement }) => statement.args.length <= 32766)).toBe(true);

      for (const statement of [...byteBounded, ...bindBounded]) {
        const expectedBytes =
          Buffer.byteLength(JSON.stringify(statement.statement)) +
          statement.statement.args.length * 64 +
          512;
        expect(statement.bytes).toBe(expectedBytes);
        expect(statement.bytes + 1024).toBeLessThanOrEqual(1_000_000);
      }

      expect(eventStatements.reduce((count, statement) => count + statement.rows, 0)).toBe(301);
      expect(byteBounded.reduce((count, statement) => count + statement.rows, 0)).toBe(
        bindBounded.reduce((count, statement) => count + statement.rows, 0),
      );
      const oversized = {
        ...original,
        events: original.events.slice(0, 1).map((event) => ({
          ...event,
          properties: { text: 'x'.repeat(1_000_000) },
        })),
      };
      expect(() => TrafficSeedStatements.create([oversized])).toThrow('bounded request size');
      expect(() => TrafficSeedStatements.create([original], 0)).toThrow('bounded request size');
    } finally {
      await Promise.all([source.close(), target.close()]);
    }
  });
});
