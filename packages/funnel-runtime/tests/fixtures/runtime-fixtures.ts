import { isUndefined } from 'es-toolkit/predicate';
import { readFileSync } from 'node:fs';
import {
  FunnelConfigurations,
  type FunnelConfiguration,
  type FunnelStep,
  type SessionAnswers,
  type StepType,
} from '@kelpie/contracts';
import { FixtureMessages } from './fixture-messages.js';

export const RuntimeFixtures = {
  progressConfiguration(excludeTypes: ReadonlyList<StepType>): FunnelConfiguration {
    const configuration = RuntimeFixtures.configuration(1);

    return { ...configuration, progress: { ...configuration.progress, excludeTypes } };
  },
  step(identifier: string): FunnelStep {
    const step = RuntimeFixtures.configuration(1).steps[identifier];

    if (isUndefined(step)) {
      throw new Error(FixtureMessages.MissingStep(identifier));
    }

    return step;
  },

  configuration(version: number): FunnelConfiguration {
    const result = FunnelConfigurations.validate(
      JSON.parse(
        readFileSync(
          new URL(`../../../../configurations/funnel-v${version}.json`, import.meta.url),
          'utf8',
        ),
      ),
    );

    if (!result.valid) {
      throw new Error(FixtureMessages.InvalidConfiguration(result.issues));
    }

    return result.configuration;
  },
} as const;

export const RuntimeAnswers = {
  complete(overrides: SessionAnswers = {}): SessionAnswers {
    return {
      team_size: 10,
      work_mode: 'remote',
      priorities: ['focus'],
      timezone_span: 'same',
      async_maturity: 'medium',
      tool_count: 3,
      office_days: 2,
      meeting_hours: 5,
      ...overrides,
    };
  },
} as const;
