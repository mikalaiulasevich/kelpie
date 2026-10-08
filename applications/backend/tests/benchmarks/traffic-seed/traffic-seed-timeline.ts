import assert from 'node:assert/strict';
import type { Prisma } from '../../../generated/prisma/client.js';
import { SessionSnapshots } from '../../../source/sessions/session-snapshots.js';
import { TrafficSession } from '../../fixtures/traffic/traffic-session.js';
import type { TrafficSeedSessionGraph } from './traffic-seed-import-types.js';
import type { TrafficSeedTimelineOptions } from './traffic-seed-types.js';
import { TrafficSeedPolicy } from './traffic-seed-policy.js';
import { TrafficSeedMessages } from './traffic-seed-messages.js';

export const TrafficSeedTimeline = {
  project(graph: TrafficSeedSessionGraph, ordinal: number, options: TrafficSeedTimelineOptions): TrafficSeedSessionGraph {
    const random = TrafficSession.random(options.seed + ordinal * 104729);
    const anchor = Date.parse(options.anchor);
    assert.ok(Number.isFinite(anchor), TrafficSeedMessages.Timeline);
    // Recent cohorts are larger, with a weekly rhythm; this is deliberately synthetic history.
    const age = Math.pow(random(), 1.35) * options.days * TrafficSeedPolicy.DayMilliseconds;
    const createdAt = new Date(anchor - TrafficSeedPolicy.RecentSafetyMilliseconds - age);
    const duration = TrafficSeedPolicy.MinimumJourneyMilliseconds + random() * TrafficSeedPolicy.JourneyVariationMilliseconds;
    const timestamps = [...new Set([
      graph.createdAt.getTime(),
      ...graph.events.flatMap((event) => [event.clientTimestamp.getTime(), event.serverTimestamp.getTime()]),
      ...graph.operations.map((operation) => operation.createdAt.getTime()),
      ...graph.transitions.map((transition) => transition.createdAt.getTime()),
      ...graph.answers.map((answer) => answer.updatedAt.getTime()),
    ])].sort((left, right) => left - right);
    const positions = new Map(timestamps.map((timestamp, index) => [timestamp, index]));
    const projectTime = (date: Date) => {
      const position = positions.get(date.getTime());
      assert.notEqual(position, undefined, TrafficSeedMessages.Timeline);

      return new Date(createdAt.getTime() + Math.round(((position ?? 0) / Math.max(1, timestamps.length - 1)) * duration));
    };
    const lifetime = graph.expiresAt.getTime() - graph.createdAt.getTime();
    assert.ok(lifetime > duration, TrafficSeedMessages.Timeline);

    return {
      ...graph,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + lifetime),
      answers: graph.answers.map((answer) => ({ ...answer, updatedAt: projectTime(answer.updatedAt) })),
      operations: graph.operations.map((operation) => {
        // Full historical responses remain readable by the existing public deployment.
        const state = SessionSnapshots.read(operation.response, graph);
        const response: Prisma.JsonValue = JSON.parse(JSON.stringify(state));

        return { ...operation, response, createdAt: projectTime(operation.createdAt) };
      }),
      transitions: graph.transitions.map((transition) => ({ ...transition, createdAt: projectTime(transition.createdAt) })),
      events: graph.events.map((event) => ({ ...event, clientTimestamp: projectTime(event.clientTimestamp), serverTimestamp: projectTime(event.serverTimestamp) })),
    };
  },
} as const;
