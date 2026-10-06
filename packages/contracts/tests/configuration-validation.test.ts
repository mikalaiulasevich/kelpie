import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FunnelConfigurations } from '../source/index.js';

function originalConfiguration(version: number): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`../../../configurations/funnel-v${version}.json`, import.meta.url),
      'utf8',
    ),
  );
}

describe('configuration validation', () => {
  it.each(
    ['title', 'body', 'primaryActionLabel'].flatMap((field) =>
      [' ', '\t\n', '\u00a0', '\ufeff'].map((value) => ({ field, value })),
    ),
  )(
    'rejects blank information content $field: $value in base and merged variants',
    ({ field, value }) => {
      const parsed = FunnelConfigurations.validate(originalConfiguration(1));

      if (!parsed.valid) {
        throw new Error('Invalid fixture.');
      }

      const configuration = parsed.configuration;
      const intro = configuration.steps['intro'];

      if (intro === undefined) {
        throw new Error('Missing introduction fixture.');
      }

      expect(
        FunnelConfigurations.validate({
          ...configuration,
          steps: {
            ...configuration.steps,
            intro: { ...intro, content: { ...intro.content, [field]: value } },
          },
        }),
      ).toMatchObject({ valid: false });

      const overridden = FunnelConfigurations.validate({
        ...configuration,
        experiment: {
          ...configuration.experiment,
          variants: {
            ...configuration.experiment.variants,
            B: {
              ...configuration.experiment.variants.B,
              stepOverrides: { intro: { content: { [field]: value } } },
            },
          },
        },
      });

      expect(overridden).toMatchObject({ valid: false });
      expect(
        overridden.issues.some((issue) => issue.path.includes('stepOverrides/intro/content')),
      ).toBe(true);
    },
  );

  it('accepts partial content overrides without trimming or mutating the configuration', () => {
    const parsed = FunnelConfigurations.validate(originalConfiguration(1));

    if (!parsed.valid) {
      throw new Error('Invalid fixture.');
    }

    const configuration = parsed.configuration;
    const document = {
      ...configuration,
      experiment: {
        ...configuration.experiment,
        variants: {
          ...configuration.experiment.variants,
          B: {
            ...configuration.experiment.variants.B,
            stepOverrides: { intro: { content: { title: '  New title  ' } } },
          },
        },
      },
    };
    const before = JSON.stringify(document);

    expect(FunnelConfigurations.validate(document).valid).toBe(true);
    expect(JSON.stringify(document)).toBe(before);
  });

  it.each([1, 2, 3])('accepts preserved version %s', (version) => {
    expect(FunnelConfigurations.validate(originalConfiguration(version))).toMatchObject({
      valid: true,
    });
  });

  it('rejects prototype keys before schema validation', () => {
    expect(FunnelConfigurations.validate(JSON.parse('{"__proto__":{}}'))).toMatchObject({
      valid: false,
    });
  });

  it('bounds nesting and does not overflow the call stack', () => {
    let nested: unknown = {};
    for (let depth = 0; depth < 1000; depth += 1) {
      nested = { all: [nested] };
    }

    expect(FunnelConfigurations.validate(nested)).toMatchObject({ valid: false });
  });

  it('rejects circular input', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(FunnelConfigurations.validate(circular)).toMatchObject({ valid: false });
  });

  it('rejects inherited configuration fields', () => {
    const parsed = FunnelConfigurations.validate(originalConfiguration(1));
    if (!parsed.valid) {
      throw new Error('The original configuration must be valid.');
    }

    const inherited: unknown = Object.create(parsed.configuration);
    expect(FunnelConfigurations.validate(inherited)).toMatchObject({ valid: false });
  });

  it('rejects unknown fields instead of silently deleting them', () => {
    const document: unknown = originalConfiguration(1);
    expect(
      FunnelConfigurations.validate({
        ...(typeof document === 'object' ? document : {}),
        executableScript: 'anything',
      }),
    ).toMatchObject({ valid: false });
  });

  it('rejects future branch dependencies in either variant', () => {
    const parsed = FunnelConfigurations.validate(originalConfiguration(1));
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
    const result = FunnelConfigurations.validate(document);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.message.includes('earlier'))).toBe(true);
    }
  });

  it('rejects invalid option references', () => {
    const parsed = FunnelConfigurations.validate(originalConfiguration(1));
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
    expect(FunnelConfigurations.validate(document)).toMatchObject({ valid: false });
  });

  it('rejects unequal identity keys and invalid experiment weights', () => {
    const parsed = FunnelConfigurations.validate(originalConfiguration(1));
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
    expect(FunnelConfigurations.validate(document)).toMatchObject({ valid: false });
  });

  it('validates merged variant content instead of only the base step', () => {
    const parsed = FunnelConfigurations.validate(originalConfiguration(1));
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
    const result = FunnelConfigurations.validate(document);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.path.includes('stepOverrides'))).toBe(true);
    }
  });

  it.each(['constructor', 'toString', 'hasOwnProperty'])(
    'rejects inherited step and result reference %s without throwing',
    (reference) => {
      const parsed = FunnelConfigurations.validate(originalConfiguration(1));
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
      expect(() => FunnelConfigurations.validate(document)).not.toThrow();
      expect(FunnelConfigurations.validate(document)).toMatchObject({ valid: false });
    },
  );
});

describe('semantic validation phases', () => {
  it('preserves step, variant, result, and event issue ordering', () => {
    const parsed = FunnelConfigurations.validate(originalConfiguration(1));

    if (!parsed.valid) {
      throw new Error('Invalid fixture.');
    }

    const configuration = parsed.configuration;
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
    expect(FunnelConfigurations.validate(originalConfiguration(1)).valid).toBe(true);
  });

  it('keeps a bounded diagnostic prefix for many semantic failures', () => {
    const parsed = FunnelConfigurations.validate(originalConfiguration(1));

    if (!parsed.valid) {
      throw new Error('Invalid fixture.');
    }

    const document = {
      ...parsed.configuration,
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
