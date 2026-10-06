import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ConditionOperator,
  ExperimentVariant,
  FunnelConfigurations,
  type FunnelConfiguration,
  type SessionAnswers,
} from '@kelpie/contracts';
import {
  FunnelRuntime,
  ConditionEvaluation,
  RouteResolution,
  ExperimentResolution,
  ResultResolution,
  AnswerValidation,
} from '../source/index.js';

function configuration(version: number): FunnelConfiguration {
  const result = FunnelConfigurations.validate(
    JSON.parse(
      readFileSync(
        new URL(`../../../configurations/funnel-v${version}.json`, import.meta.url),
        'utf8',
      ),
    ),
  );
  if (!result.valid) {
    throw new Error(JSON.stringify(result.issues));
  }

  return result.configuration;
}

const completeAnswers: SessionAnswers = {
  team_size: 10,
  work_mode: 'remote',
  priorities: ['focus'],
  timezone_span: 'same',
  async_maturity: 'medium',
  tool_count: 3,
  office_days: 2,
  meeting_hours: 5,
};

describe('pure funnel runtime', () => {
  it('keeps route state isolated across repeated resolutions and variants', () => {
    const document = configuration(1);
    const originalDocument = structuredClone(document);
    const originalAnswers = structuredClone(completeAnswers);
    const firstRoute = FunnelRuntime.Routes.resolve(document, ExperimentVariant.A, completeAnswers);
    const firstSnapshot = structuredClone(firstRoute);
    const emptyRoute = FunnelRuntime.Routes.resolve(document, ExperimentVariant.B, {});
    const repeatedRoute = FunnelRuntime.Routes.resolve(
      document,
      ExperimentVariant.A,
      completeAnswers,
    );

    expect(emptyRoute.activeAnswers).toEqual({});
    expect(emptyRoute.completedQuestionCount).toBe(0);
    expect(firstRoute).toEqual(firstSnapshot);
    expect(repeatedRoute).toEqual(firstSnapshot);
    expect(repeatedRoute.steps).not.toBe(firstRoute.steps);
    expect(repeatedRoute.activeAnswers).not.toBe(firstRoute.activeAnswers);
    expect(document).toEqual(originalDocument);
    expect(completeAnswers).toEqual(originalAnswers);
  });

  it('selects the first matching result rule without evaluating later rules', () => {
    const document = configuration(1);
    const matchingCondition = {
      answer: 'team_size',
      operator: ConditionOperator.Equal,
      value: 10,
    } as const;
    const orderedDocument: FunnelConfiguration = {
      ...document,
      resultRules: [
        { resultId: 'async_native', when: matchingCondition },
        {
          resultId: 'office_core',
          get when(): never {
            throw new Error('A later rule must not be evaluated after a match.');
          },
        },
      ],
    };

    expect(
      FunnelRuntime.Results.resolve(orderedDocument, ExperimentVariant.A, completeAnswers)?.id,
    ).toBe('async_native');
  });

  it('uses the default result when no result rule matches', () => {
    const document = configuration(1);
    const unmatchedDocument: FunnelConfiguration = {
      ...document,
      resultRules: [
        {
          resultId: 'async_native',
          when: { answer: 'team_size', operator: ConditionOperator.Equal, value: 200 },
        },
      ],
    };

    expect(
      FunnelRuntime.Results.resolve(unmatchedDocument, ExperimentVariant.A, completeAnswers)?.id,
    ).toBe(document.defaultResultId);
  });

  it.each([1, 2, 3])(
    'applies the same result overrides through both resolvers in version %s',
    (version) => {
      const document = configuration(version);
      const before = JSON.stringify(document);

      for (const variant of [ExperimentVariant.A, ExperimentVariant.B]) {
        const result = ResultResolution.resolve(document, variant, completeAnswers);
        const resolved = ExperimentResolution.resolve(document, variant);

        expect(result).toBeDefined();

        if (result === undefined) {
          throw new Error('Complete fixture answers must produce a result.');
        }

        expect(result).toEqual(resolved.results[result.id]);
      }

      expect(JSON.stringify(document)).toBe(before);
    },
  );

  it('ignores inherited result overrides in both resolvers', () => {
    const document = configuration(1);
    const resultOverrides = {};
    Object.setPrototypeOf(resultOverrides, { balanced: { title: 'Inherited title' } });

    const inheritedDocument: FunnelConfiguration = {
      ...document,
      experiment: {
        ...document.experiment,
        variants: {
          ...document.experiment.variants,
          B: { ...document.experiment.variants.B, resultOverrides },
        },
      },
    };

    expect(
      ResultResolution.resolve(inheritedDocument, ExperimentVariant.B, completeAnswers),
    ).toEqual(document.results['balanced']);
    expect(
      ExperimentResolution.resolve(inheritedDocument, ExperimentVariant.B).results['balanced'],
    ).toEqual(document.results['balanced']);
  });

  it('resolves variant order and copy without changing the original document', () => {
    const document = configuration(1);
    const before = JSON.stringify(document);
    const resolved = ExperimentResolution.resolve(document, ExperimentVariant.B);
    expect(resolved.stepSequence[1]).toBe('work_mode');
    expect(resolved.steps['intro']?.content.primaryActionLabel).toBe('Show me');
    expect(JSON.stringify(document)).toBe(before);
  });

  it('omits office days for remote work and excludes retained answers', () => {
    const route = RouteResolution.resolve(configuration(1), ExperimentVariant.A, completeAnswers);
    expect(route.steps.some((step) => step.id === 'office_days')).toBe(false);
    expect(route.activeAnswers['office_days']).toBeUndefined();
    expect(route.questionCount).toBe(6);
    expect(route.completedQuestionCount).toBe(6);
  });

  it('restores the available office branch when the user changes work mode', () => {
    const route = RouteResolution.resolve(configuration(1), ExperimentVariant.A, {
      ...completeAnswers,
      work_mode: 'hybrid',
    });
    expect(route.activeAnswers['office_days']).toBe(2);
    expect(route.questionCount).toBe(7);
    expect(RouteResolution.next(route, 'timezone_span')?.id).toBe('office_days');
    expect(RouteResolution.previous(route, 'office_days')?.id).toBe('timezone_span');
    expect(RouteResolution.next(route, 'unknown')).toBeUndefined();
  });

  it('excludes tool_count in version three variant B', () => {
    const route = RouteResolution.resolve(configuration(3), ExperimentVariant.B, completeAnswers);
    expect(route.activeAnswers['tool_count']).toBeUndefined();
    expect(route.steps.some((step) => step.id === 'tool_count')).toBe(false);
  });

  it('resolves compliance priority first and ignores inactive compliance answers', () => {
    const document = configuration(3);
    expect(
      ResultResolution.resolve(document, ExperimentVariant.A, {
        ...completeAnswers,
        priorities: ['compliance'],
        security_constraints: 'regulated',
        meeting_hours: 20,
      })?.id,
    ).toBe('regulated_scale');
    expect(
      ResultResolution.resolve(document, ExperimentVariant.A, {
        ...completeAnswers,
        security_constraints: 'regulated',
      })?.id,
    ).toBe('balanced');
  });

  it('requires all active required answers before resolving a result', () => {
    expect(
      ResultResolution.resolve(configuration(1), ExperimentVariant.A, { work_mode: 'remote' }),
    ).toBeUndefined();
    expect(
      ResultResolution.resolve(configuration(1), ExperimentVariant.B, completeAnswers)?.cta.label,
    ).toBe('See the 30-day action list');
  });

  it('does not let invalid answers activate branches', () => {
    expect(
      RouteResolution.resolve(configuration(3), ExperimentVariant.A, {
        ...completeAnswers,
        priorities: ['compliance', 'unknown'],
      }).activeAnswers['security_constraints'],
    ).toBeUndefined();
    expect(
      ConditionEvaluation.evaluate(
        { answer: 'missing', operator: ConditionOperator.Equal, value: 'x' },
        {},
      ),
    ).toBe(false);
  });

  it('rejects invalid numeric and multi-select answers', () => {
    const document = configuration(1);
    const numberStep = document.steps['team_size'];
    const selectionStep = document.steps['priorities'];
    if (!numberStep || !selectionStep) {
      throw new Error('Missing fixture steps.');
    }

    for (const answer of [NaN, Infinity, '10', 0, 201, 1.5]) {
      expect(AnswerValidation.validate(numberStep, answer).valid).toBe(false);
    }

    for (const answer of [
      [],
      ['focus', 'focus'],
      ['unknown'],
      ['focus', 'speed', 'culture', 'cost'],
    ]) {
      expect(AnswerValidation.validate(selectionStep, answer).valid).toBe(false);
    }

    expect(AnswerValidation.validate(numberStep, 10).valid).toBe(true);
  });
});
