import { FunnelConfigurations } from '../../source/index.js';
import { ConfigurationFixtures } from './configuration-fixtures.js';

export const DiagnosticFixtures = {
  multiplePhaseFailures() {
    const configuration = ConfigurationFixtures.valid();

    const document = {
      ...configuration,
      steps: {
        ...configuration.steps,
        intro: { ...configuration.steps['intro'], id: 'different_identifier' },
      },
      experiment: {
        ...configuration.experiment,
        variants: {
          ...configuration.experiment.variants,
          A: { ...configuration.experiment.variants.A, weight: 1 },
        },
      },
      defaultResultId: 'missing_result',
      events: { ...configuration.events, baseProperties: ['unsupported_property'] },
    };

    return document;
  },

  excessiveSemanticFailures() {
    const configuration = ConfigurationFixtures.valid();

    const document = {
      ...configuration,
      resultRules: Array.from({ length: FunnelConfigurations.limits.maximumIssues + 1 }, () => ({
        resultId: 'missing_result',
        when: { answer: 'missing_answer', operator: 'eq', value: 1 },
      })),
    };

    return document;
  },

  pathCompatibilityFailures() {
    const configuration = ConfigurationFixtures.valid();

    const numericStep = ConfigurationFixtures.numberStep(configuration);

    return {
      ...configuration,
      steps: {
        ...configuration.steps,
        team_size: {
          ...numericStep,
          input: { ...numericStep.input, min: numericStep.input.max + 1 },
          visibleWhen: { answer: 'missing_answer', operator: 'eq', value: 1 },
        },
      },
      experiment: {
        ...configuration.experiment,
        variants: {
          ...configuration.experiment.variants,
          B: {
            ...configuration.experiment.variants.B,
            stepOverrides: {
              work_mode: { content: { title: ' ' } },
              absent_step: { content: {} },
            },
            resultOverrides: { absent_result: { title: 'Unknown result' } },
          },
        },
      },
      events: {
        ...configuration.events,
        allowed: [
          ...configuration.events.allowed,
          { name: 'custom_event', trigger: 'Test', properties: ['unsupported_property'] },
        ],
      },
    };
  },
} as const;
