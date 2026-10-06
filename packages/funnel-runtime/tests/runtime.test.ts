import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ConditionOperator,
  ExperimentVariant,
  validateFunnelConfiguration,
  type FunnelConfiguration,
  type SessionAnswers,
} from '@kelpie/contracts';
import {
  evaluateCondition,
  resolveAvailableSteps,
  resolveExperimentConfiguration,
  resolveFunnelResult,
  resolveNextStep,
  resolvePreviousStep,
  validateStepAnswer,
} from '../source/index.js';

function configuration(version: number): FunnelConfiguration {
  const result = validateFunnelConfiguration(
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
  it.each([1, 2, 3])(
    'applies the same result overrides through both resolvers in version %s',
    (version) => {
      const document = configuration(version);
      const before = JSON.stringify(document);

      for (const variant of [ExperimentVariant.A, ExperimentVariant.B]) {
        const result = resolveFunnelResult(document, variant, completeAnswers);
        const resolved = resolveExperimentConfiguration(document, variant);

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

    expect(resolveFunnelResult(inheritedDocument, ExperimentVariant.B, completeAnswers)).toEqual(
      document.results['balanced'],
    );
    expect(
      resolveExperimentConfiguration(inheritedDocument, ExperimentVariant.B).results['balanced'],
    ).toEqual(document.results['balanced']);
  });

  it('resolves variant order and copy without changing the original document', () => {
    const document = configuration(1);
    const before = JSON.stringify(document);
    const resolved = resolveExperimentConfiguration(document, ExperimentVariant.B);
    expect(resolved.stepSequence[1]).toBe('work_mode');
    expect(resolved.steps['intro']?.content.primaryActionLabel).toBe('Show me');
    expect(JSON.stringify(document)).toBe(before);
  });

  it('omits office days for remote work and excludes retained answers', () => {
    const route = resolveAvailableSteps(configuration(1), ExperimentVariant.A, completeAnswers);
    expect(route.steps.some((step) => step.id === 'office_days')).toBe(false);
    expect(route.activeAnswers['office_days']).toBeUndefined();
    expect(route.questionCount).toBe(6);
    expect(route.completedQuestionCount).toBe(6);
  });

  it('restores the available office branch when the user changes work mode', () => {
    const route = resolveAvailableSteps(configuration(1), ExperimentVariant.A, {
      ...completeAnswers,
      work_mode: 'hybrid',
    });
    expect(route.activeAnswers['office_days']).toBe(2);
    expect(route.questionCount).toBe(7);
    expect(resolveNextStep(route, 'timezone_span')?.id).toBe('office_days');
    expect(resolvePreviousStep(route, 'office_days')?.id).toBe('timezone_span');
    expect(resolveNextStep(route, 'unknown')).toBeUndefined();
  });

  it('excludes tool_count in version three variant B', () => {
    const route = resolveAvailableSteps(configuration(3), ExperimentVariant.B, completeAnswers);
    expect(route.activeAnswers['tool_count']).toBeUndefined();
    expect(route.steps.some((step) => step.id === 'tool_count')).toBe(false);
  });

  it('resolves compliance priority first and ignores inactive compliance answers', () => {
    const document = configuration(3);
    expect(
      resolveFunnelResult(document, ExperimentVariant.A, {
        ...completeAnswers,
        priorities: ['compliance'],
        security_constraints: 'regulated',
        meeting_hours: 20,
      })?.id,
    ).toBe('regulated_scale');
    expect(
      resolveFunnelResult(document, ExperimentVariant.A, {
        ...completeAnswers,
        security_constraints: 'regulated',
      })?.id,
    ).toBe('balanced');
  });

  it('requires all active required answers before resolving a result', () => {
    expect(
      resolveFunnelResult(configuration(1), ExperimentVariant.A, { work_mode: 'remote' }),
    ).toBeUndefined();
    expect(
      resolveFunnelResult(configuration(1), ExperimentVariant.B, completeAnswers)?.cta.label,
    ).toBe('See the 30-day action list');
  });

  it('does not let invalid answers activate branches', () => {
    expect(
      resolveAvailableSteps(configuration(3), ExperimentVariant.A, {
        ...completeAnswers,
        priorities: ['compliance', 'unknown'],
      }).activeAnswers['security_constraints'],
    ).toBeUndefined();
    expect(
      evaluateCondition({ answer: 'missing', operator: ConditionOperator.Equal, value: 'x' }, {}),
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
      expect(validateStepAnswer(numberStep, answer).valid).toBe(false);
    }

    for (const answer of [
      [],
      ['focus', 'focus'],
      ['unknown'],
      ['focus', 'speed', 'culture', 'cost'],
    ]) {
      expect(validateStepAnswer(selectionStep, answer).valid).toBe(false);
    }

    expect(validateStepAnswer(numberStep, 10).valid).toBe(true);
  });
});
