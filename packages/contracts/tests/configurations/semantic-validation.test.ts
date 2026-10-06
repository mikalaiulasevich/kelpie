import { describe, expect, it } from 'vitest';
import { FunnelConfigurations } from '../../source/index.js';
import { ConfigurationFixtures } from '../fixtures/configuration-fixtures.js';
import { ConfigurationCases } from '../cases/configuration-cases.js';

describe('semantic validation', () => {
  it('rejects future branch dependencies in either variant', () => {
    const configuration = ConfigurationFixtures.valid();

    const document = {
      ...configuration,
      steps: {
        ...configuration.steps,
        intro: {
          ...configuration.steps['intro'],
          visibleWhen: { answer: 'team_size', operator: 'gte', value: 1 },
        },
      },
    };
    const result = FunnelConfigurations.validate(document);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('earlier'))).toBe(true);
  });

  it('rejects invalid option references', () => {
    const configuration = ConfigurationFixtures.valid();

    const document = {
      ...configuration,
      resultRules: [
        {
          resultId: 'balanced',
          when: { answer: 'work_mode', operator: 'eq', value: 'teleportation' },
        },
      ],
    };
    expect(FunnelConfigurations.validate(document)).toMatchObject({ valid: false });
  });

  it('rejects experiment weights that do not sum to one hundred', () => {
    const configuration = ConfigurationFixtures.valid();

    const document = {
      ...configuration,
      experiment: {
        ...configuration.experiment,
        variants: {
          ...configuration.experiment.variants,
          A: { ...configuration.experiment.variants.A, weight: 10 },
        },
      },
    };
    expect(FunnelConfigurations.validate(document)).toMatchObject({ valid: false });
  });

  it.each(ConfigurationCases.inheritedReferences)(
    'rejects inherited step and result reference %s without throwing',
    (reference) => {
      const configuration = ConfigurationFixtures.valid();

      const document = {
        ...configuration,
        defaultResultId: reference,
        resultRules: [
          { resultId: reference, when: { answer: 'team_size', operator: 'gte', value: 1 } },
        ],
        experiment: {
          ...configuration.experiment,
          variants: {
            ...configuration.experiment.variants,
            A: {
              ...configuration.experiment.variants.A,
              stepSequence: [
                reference,
                ...configuration.experiment.variants.A.stepSequence.slice(1),
              ],
            },
          },
        },
      };
      expect(() => FunnelConfigurations.validate(document)).not.toThrow();
      expect(FunnelConfigurations.validate(document)).toMatchObject({ valid: false });
    },
  );
});
