import { FunnelConfigurations, type FunnelConfiguration } from '../../source/index.js';
import { ConfigurationFixtures } from './configuration-fixtures.js';

export const DiagnosticFixtures = {
  multiplePhaseFailures(): FunnelConfiguration {
    const configuration = ConfigurationFixtures.valid();

    return {
      ...configuration,
      steps: {
        ...configuration.steps,
        intro: {
          ...ConfigurationFixtures.informationStep(configuration),
          id: 'different_identifier',
        },
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
  },

  excessiveSemanticFailures(): FunnelConfiguration {
    const configuration = ConfigurationFixtures.valid();

    return {
      ...configuration,
      resultRules: Array.from({ length: FunnelConfigurations.limits.maximumIssues + 1 }, () => ({
        resultId: 'missing_result',
        when: { answer: 'missing_answer', operator: 'eq', value: 1 },
      })),
    };
  },

  eventDeclarationFailures(): FunnelConfiguration {
    const configuration = ConfigurationFixtures.valid();

    return {
      ...configuration,
      events: {
        ...configuration.events,
        baseProperties: ['unsupported_first', 'event_id', 'unsupported_second'],
        allowed: [
          { name: 'custom_event', trigger: 'Test', properties: ['unsupported_first', 'action'] },
          { name: 'custom_event', trigger: 'Test', properties: ['source', 'unsupported_second'] },
          ...configuration.events.allowed.slice(2),
        ],
      },
    };
  },

  pathCompatibilityFailures(): FunnelConfiguration {
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
