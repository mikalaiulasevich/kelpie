import { describe, expect, it } from 'vitest';
import { FunnelConfigurations } from '../../source/index.js';
import { ConfigurationFixtures } from '../fixtures/configuration-fixtures.js';

describe('semantic validation phases', () => {
  it('preserves step, variant, result, and event issue ordering', () => {
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

    const result = FunnelConfigurations.validate(document);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual([
      '/steps/intro/id',
      '/experiment/variants',
      '/defaultResultId',
      '/events/baseProperties',
    ]);
    // A failed traversal must not leak diagnostics or indexes into the next document.
    expect(FunnelConfigurations.validate(ConfigurationFixtures.original(1)).valid).toBe(true);
  });

  it('keeps a bounded diagnostic prefix for many semantic failures', () => {
    const configuration = ConfigurationFixtures.valid();

    const document = {
      ...configuration,
      resultRules: Array.from({ length: FunnelConfigurations.limits.maximumIssues + 1 }, () => ({
        resultId: 'missing_result',
        when: { answer: 'missing_answer', operator: 'eq', value: 1 },
      })),
    };
    const result = FunnelConfigurations.validate(document);

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(FunnelConfigurations.limits.maximumIssues);
    expect(result.issues[0]?.path).toBe('/resultRules/0/resultId');
    expect(result.issues[1]?.path).toBe('/resultRules/0/when');
  });
});

describe('diagnostic path compatibility', () => {
  it('preserves concrete override, visibility, event, and numeric locations', () => {
    const configuration = ConfigurationFixtures.valid();

    const numericStep = ConfigurationFixtures.numberStep(configuration);

    const result = FunnelConfigurations.validate({
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
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual([
      '/steps/team_size/input',
      '/steps/team_size/visibleWhen',
      '/experiment/variants/B/stepOverrides/work_mode/content/title',
      '/steps/team_size/visibleWhen',
      '/experiment/variants/B/stepOverrides/absent_step',
      '/experiment/variants/B/resultOverrides/absent_result',
      '/events/allowed',
    ]);
  });
});
