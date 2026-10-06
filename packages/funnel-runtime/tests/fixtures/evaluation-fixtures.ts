import { StepRules, type FunnelConfiguration, type SessionAnswers } from '@kelpie/contracts';
import { RuntimeAnswers, RuntimeFixtures } from './runtime-fixtures.js';
import { FixtureMessages } from './fixture-messages.js';

export const EvaluationFixtures = {
  configuration(required: boolean): FunnelConfiguration {
    const configuration = RuntimeFixtures.configuration(1);
    const step = configuration.steps['team_size'];

    if (step === undefined || !StepRules.isInteractive(step)) {
      throw new Error(FixtureMessages.MissingStep('team_size'));
    }

    return {
      ...configuration,
      steps: {
        ...configuration.steps,
        team_size: { ...step, validation: { ...step.validation, required } },
      },
    };
  },

  answers(teamSize: Optional<number>): SessionAnswers {
    const answers = { ...RuntimeAnswers.complete() };
    delete answers['team_size'];

    return teamSize === undefined ? answers : { ...answers, team_size: teamSize };
  },
} as const;
