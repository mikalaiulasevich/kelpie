import { describe, expect, it } from 'vitest';
import { SessionSnapshots } from '../../../source/sessions/session-snapshots.js';
import { TrafficSeedCommandFixture } from '../../fixtures/traffic-seed-command-fixture.js';
import { TrafficSeedTimeline } from './traffic-seed-timeline.js';

describe('synthetic history timeline', () => {
  it('reproducibly spreads sessions across dates and preserves ordered journey evidence', async () => {
    const { backend, graph } = await TrafficSeedCommandFixture.timeline();
    const options = { anchor: '2026-10-08T12:00:00Z', days: 28, seed: 20261008 };

    try {
      const projected = TrafficSeedTimeline.project(graph, 0, options);
      expect(TrafficSeedTimeline.project(graph, 0, options)).toEqual(projected);
      expect(projected.expiresAt.getTime() - projected.createdAt.getTime()).toBe(
        graph.expiresAt.getTime() - graph.createdAt.getTime(),
      );
      expect(projected.operations.length).toBeGreaterThan(0);
      expect(
        projected.operations.every((operation) => !SessionSnapshots.isCompact(operation.response)),
      ).toBe(true);

      for (const event of projected.events) {
        expect(event.clientTimestamp.getTime()).toBeLessThanOrEqual(
          event.serverTimestamp.getTime(),
        );
        expect(event.serverTimestamp.getTime()).toBeLessThan(Date.parse(options.anchor));
      }

      const days = new Set(
        Array.from({ length: 100 }, (_, ordinal) =>
          TrafficSeedTimeline.project(graph, ordinal, options).createdAt.toISOString().slice(0, 10),
        ),
      );
      expect(days.size).toBeGreaterThan(20);
      expect(graph.createdAt).not.toEqual(projected.createdAt);
      expect(() =>
        TrafficSeedTimeline.project(graph, 0, { ...options, anchor: 'invalid' }),
      ).toThrow();
    } finally {
      await backend.close();
    }
  });
});
