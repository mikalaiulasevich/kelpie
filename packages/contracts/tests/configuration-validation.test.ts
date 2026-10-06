import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateFunnelConfiguration } from '../source/index.js';

function originalConfiguration(version: number): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`../../../configurations/funnel-v${version}.json`, import.meta.url),
      'utf8',
    ),
  );
}

describe('configuration validation', () => {
  it.each([1, 2, 3])('accepts preserved version %s', (version) => {
    expect(validateFunnelConfiguration(originalConfiguration(version))).toMatchObject({
      valid: true,
    });
  });

  it('rejects prototype keys before schema validation', () => {
    expect(validateFunnelConfiguration(JSON.parse('{"__proto__":{}}'))).toMatchObject({
      valid: false,
    });
  });

  it('bounds nesting and does not overflow the call stack', () => {
    let nested: unknown = {};
    for (let depth = 0; depth < 1000; depth += 1) {
      nested = { all: [nested] };
    }

    expect(validateFunnelConfiguration(nested)).toMatchObject({ valid: false });
  });

  it('rejects circular input', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(validateFunnelConfiguration(circular)).toMatchObject({ valid: false });
  });

  it('rejects inherited configuration fields', () => {
    const inherited: unknown = Object.create(originalConfiguration(1));
    expect(validateFunnelConfiguration(inherited)).toMatchObject({ valid: false });
  });

  it('rejects unknown fields instead of silently deleting them', () => {
    const document: unknown = originalConfiguration(1);
    expect(
      validateFunnelConfiguration({
        ...(typeof document === 'object' ? document : {}),
        executableScript: 'anything',
      }),
    ).toMatchObject({ valid: false });
  });

  it('rejects future branch dependencies in either variant', () => {
    const parsed = validateFunnelConfiguration(originalConfiguration(1));
    if (!parsed.valid) {
      throw new Error('Invalid fixture.');
    }

    const document = {
      ...parsed.configuration,
      steps: {
        ...parsed.configuration.steps,
        intro: {
          ...parsed.configuration.steps['intro'],
          visibleWhen: { answer: 'team_size', operator: 'gte', value: 1 },
        },
      },
    };
    const result = validateFunnelConfiguration(document);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.message.includes('earlier'))).toBe(true);
    }
  });

  it('rejects invalid option references', () => {
    const parsed = validateFunnelConfiguration(originalConfiguration(1));
    if (!parsed.valid) {
      throw new Error('Invalid fixture.');
    }

    const document = {
      ...parsed.configuration,
      resultRules: [
        {
          resultId: 'balanced',
          when: { answer: 'work_mode', operator: 'eq', value: 'teleportation' },
        },
      ],
    };
    expect(validateFunnelConfiguration(document)).toMatchObject({ valid: false });
  });

  it('rejects unequal identity keys and invalid experiment weights', () => {
    const parsed = validateFunnelConfiguration(originalConfiguration(1));
    if (!parsed.valid) {
      throw new Error('Invalid fixture.');
    }

    const document = {
      ...parsed.configuration,
      experiment: {
        ...parsed.configuration.experiment,
        variants: {
          ...parsed.configuration.experiment.variants,
          A: { ...parsed.configuration.experiment.variants.A, weight: 10 },
        },
      },
    };
    expect(validateFunnelConfiguration(document)).toMatchObject({ valid: false });
  });

  it('validates merged variant content instead of only the base step', () => {
    const parsed = validateFunnelConfiguration(originalConfiguration(1));
    if (!parsed.valid) {
      throw new Error('Invalid fixture.');
    }

    const document = {
      ...parsed.configuration,
      experiment: {
        ...parsed.configuration.experiment,
        variants: {
          ...parsed.configuration.experiment.variants,
          B: {
            ...parsed.configuration.experiment.variants.B,
            stepOverrides: { intro: { content: { title: ' ' } } },
          },
        },
      },
    };
    const result = validateFunnelConfiguration(document);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.path.includes('stepOverrides'))).toBe(true);
    }
  });

  it.each(['constructor', 'toString', 'hasOwnProperty'])(
    'rejects inherited step and result reference %s without throwing',
    (reference) => {
      const parsed = validateFunnelConfiguration(originalConfiguration(1));
      if (!parsed.valid) {
        throw new Error('Invalid fixture.');
      }

      const document = {
        ...parsed.configuration,
        defaultResultId: reference,
        resultRules: [
          { resultId: reference, when: { answer: 'team_size', operator: 'gte', value: 1 } },
        ],
        experiment: {
          ...parsed.configuration.experiment,
          variants: {
            ...parsed.configuration.experiment.variants,
            A: {
              ...parsed.configuration.experiment.variants.A,
              stepSequence: [
                reference,
                ...parsed.configuration.experiment.variants.A.stepSequence.slice(1),
              ],
            },
          },
        },
      };
      expect(() => validateFunnelConfiguration(document)).not.toThrow();
      expect(validateFunnelConfiguration(document)).toMatchObject({ valid: false });
    },
  );
});
