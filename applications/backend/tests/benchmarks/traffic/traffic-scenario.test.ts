import { describe, expect, it } from 'vitest';
import type { FunnelStep } from '@kelpie/contracts';
import { TrafficScenario } from '../../fixtures/traffic/traffic-scenario.js';
import { TrafficSession } from '../../fixtures/traffic/traffic-session.js';

describe('synthetic traffic variety', () => {
  it('covers every campaign in each version slot, including unattributed direct traffic', () => {
    const cohorts = Array.from({ length: 27 }, (_, index) => ({
      version: index % 3,
      campaign: TrafficScenario.campaign(index),
    }));

    for (let version = 0; version < 3; version += 1) {
      const campaigns = cohorts.filter((cohort) => cohort.version === version);
      expect(new Set(campaigns.map((cohort) => cohort.campaign.campaign)).size).toBe(9);
      expect(
        campaigns.some(
          ({ campaign }) =>
            campaign.source === '' && campaign.medium === '' && campaign.campaign === '',
        ),
      ).toBe(true);
    }
  });

  it('produces deterministic intro and late exits, completions and differentiated campaign clicks', () => {
    const random = TrafficSession.random(20261008);
    const repeated = TrafficSession.random(20261008);
    const dropouts = new Set<number>();
    const clicks = Array.from({ length: 9 }, () => 0);

    for (let index = 0; index < 9000; index += 1) {
      const dropout = TrafficScenario.dropout(index, 'A', 9, random);
      expect(dropout).toBe(TrafficScenario.dropout(index, 'A', 9, repeated));
      dropouts.add(dropout);
      const campaignIndex = Math.floor(index / 3) % 9;
      const clicked = TrafficScenario.clicks(index, 'A', random);
      expect(clicked).toBe(TrafficScenario.clicks(index, 'A', repeated));
      clicks[campaignIndex] = (clicks[campaignIndex] ?? 0) + Number(clicked);
    }

    expect([...dropouts].sort((left, right) => left - right)).toEqual([
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      Number.POSITIVE_INFINITY,
    ]);
    expect(clicks[5]).toBeGreaterThan(650);
    expect(clicks[7]).toBeLessThan(430);
  });

  it('samples plausible team sizes and unique multi-selections across every valid count', () => {
    const numberStep: FunnelStep = {
      id: 'team_size',
      type: 'number',
      content: { title: 'Team size' },
      input: { name: 'team_size', min: 1, max: 200, step: 1 },
      validation: { required: true, messages: {} },
    };
    const selectionStep: FunnelStep = {
      id: 'priorities',
      type: 'multi-select',
      content: { title: 'Priorities' },
      input: {
        name: 'priorities',
        options: [
          { value: 'speed', label: 'Speed' },
          { value: 'focus', label: 'Focus' },
          { value: 'culture', label: 'Culture' },
          { value: 'compliance', label: 'Compliance' },
        ],
      },
      validation: { required: true, minSelections: 1, maxSelections: 3, messages: {} },
    };
    const random = TrafficSession.random(20261008);
    const counts = new Set<number>();
    let smallTeams = 0;

    for (let index = 0; index < 1000; index += 1) {
      const size = TrafficScenario.answer(numberStep, random);
      expect(typeof size).toBe('number');

      if (typeof size === 'number' && size <= 25) {
        smallTeams += 1;
      }

      const answers = TrafficScenario.answer(selectionStep, random);
      expect(Array.isArray(answers)).toBe(true);

      if (Array.isArray(answers)) {
        expect(new Set(answers).size).toBe(answers.length);
        counts.add(answers.length);
      }
    }

    expect(smallTeams).toBeGreaterThan(550);
    expect([...counts].sort()).toEqual([1, 2, 3]);
  });
});
