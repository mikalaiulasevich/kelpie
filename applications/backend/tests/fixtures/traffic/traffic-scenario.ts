import assert from 'node:assert/strict';
import type { FunnelStep } from '@kelpie/contracts';
import { TrafficMessages } from '../../benchmarks/traffic/traffic-messages.js';
import { TrafficScenarioPolicy } from './traffic-scenario-policy.js';

export const TrafficScenario = {
  campaign(index: number) {
    const campaign =
      TrafficScenarioPolicy.Campaigns[
        Math.floor(index / 3) % TrafficScenarioPolicy.Campaigns.length
      ];
    assert.ok(campaign, TrafficMessages.MissingStep);

    return campaign;
  },

  dropout(index: number, variant: string, stepCount: number, random: () => number): number {
    const completion =
      this.campaign(index).completion +
      (variant === 'B' ? TrafficScenarioPolicy.VariantCompletionUplift : 0);

    if (random() < completion) {
      return Number.POSITIVE_INFINITY;
    }

    // Include intro exits and late abandonment, without counting a result as a dropout.
    return Math.floor(random() * Math.max(1, stepCount - 1));
  },

  clicks(index: number, variant: string, random: () => number): boolean {
    return (
      random() <
      this.campaign(index).click + (variant === 'B' ? TrafficScenarioPolicy.VariantClickUplift : 0)
    );
  },

  answer(step: FunnelStep, random: () => number): unknown {
    if (step.type === 'number') {
      const profiles = TrafficScenarioPolicy.NumericAnswers;
      const profile = Object.entries(profiles).find(([identifier]) => identifier === step.id)?.[1];
      const candidate =
        profile?.[Math.floor(random() * profile.length)] ??
        step.input.min + random() ** 2 * (step.input.max - step.input.min);
      const maximumSlot = Math.floor((step.input.max - step.input.min) / step.input.step);
      const slot = Math.max(
        0,
        Math.min(maximumSlot, Math.round((candidate - step.input.min) / step.input.step)),
      );

      return step.input.min + slot * step.input.step;
    }

    if (step.type === 'single-select') {
      const option = step.input.options[Math.floor(random() * step.input.options.length)];
      assert.ok(option, TrafficMessages.MissingStep);

      return option.value;
    }

    if (step.type === 'multi-select') {
      const options = [...step.input.options];
      const minimum = Math.max(
        step.validation.required ? 1 : 0,
        step.validation.minSelections ?? 0,
      );
      const maximum = Math.min(options.length, step.validation.maxSelections ?? options.length);
      const count = minimum + Math.floor(random() * (maximum - minimum + 1));
      const selected: string[] = [];

      for (let index = 0; index < count; index += 1) {
        const [option] = options.splice(Math.floor(random() * options.length), 1);
        assert.ok(option, TrafficMessages.MissingStep);
        selected.push(option.value);
      }

      return selected;
    }

    return null;
  },
} as const;
