import { describe, expect, it } from 'vitest';
import { ConditionOperator, ExperimentVariant, type FunnelConfiguration } from '@kelpie/contracts';
import { FunnelRuntime, ResultResolution } from '../../source/index.js';
import { RuntimeFixtures, RuntimeAnswers } from '../fixtures/runtime-fixtures.js';
import { FixtureMessages } from '../fixtures/fixture-messages.js';

describe('results', () => {
  it('selects the first matching result rule without evaluating later rules', () => {
    const document = RuntimeFixtures.configuration(1);
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
            throw new Error(FixtureMessages.UnexpectedRuleRead);
          },
        },
      ],
    };

    expect(
      FunnelRuntime.Results.resolve(orderedDocument, ExperimentVariant.A, RuntimeAnswers.complete())
        ?.id,
    ).toBe('async_native');
  });

  it('uses the default result when no result rule matches', () => {
    const document = RuntimeFixtures.configuration(1);
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
      FunnelRuntime.Results.resolve(
        unmatchedDocument,
        ExperimentVariant.A,
        RuntimeAnswers.complete(),
      )?.id,
    ).toBe('balanced');
  });

  it('resolves compliance priority first and ignores inactive compliance answers', () => {
    const document = RuntimeFixtures.configuration(3);
    const complianceAnswers = RuntimeAnswers.complete({
      priorities: ['compliance'],
      security_constraints: 'regulated',
      meeting_hours: 20,
    });
    const inactiveComplianceAnswers = RuntimeAnswers.complete({
      security_constraints: 'regulated',
    });

    const complianceResult = ResultResolution.resolve(
      document,
      ExperimentVariant.A,
      complianceAnswers,
    );
    const inactiveComplianceResult = ResultResolution.resolve(
      document,
      ExperimentVariant.A,
      inactiveComplianceAnswers,
    );

    expect(complianceResult?.id).toBe('regulated_scale');
    expect(inactiveComplianceResult?.id).toBe('balanced');
  });

  it('requires all active required answers before resolving a result', () => {
    expect(
      ResultResolution.resolve(RuntimeFixtures.configuration(1), ExperimentVariant.A, {
        work_mode: 'remote',
      }),
    ).toBeUndefined();
    expect(
      ResultResolution.resolve(
        RuntimeFixtures.configuration(1),
        ExperimentVariant.B,
        RuntimeAnswers.complete(),
      )?.cta.label,
    ).toBe('See the 30-day action list');
  });
});
