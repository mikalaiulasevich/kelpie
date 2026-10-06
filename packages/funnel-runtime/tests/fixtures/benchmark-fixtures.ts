import assert from 'node:assert/strict';
import {
  ConditionOperator,
  ExperimentVariant,
  FunnelConfigurations,
  StepType,
  type FunnelStep,
  type Condition,
  type FunnelConfiguration,
  type MultipleSelectionStep,
  type NumberStep,
  type SingleSelectionStep,
} from '@kelpie/contracts';
import type { BenchmarkFunnel } from '../benchmarks/benchmark-types.js';
import { BenchmarkPolicy } from '../benchmarks/benchmark-policy.js';
import { RuntimeFixtures } from './runtime-fixtures.js';

export const BenchmarkFixtures = {
  validated(fixture: BenchmarkFunnel): BenchmarkFunnel {
    const validation = FunnelConfigurations.validate(fixture.configuration);

    if (!validation.valid) {
      assert.fail(JSON.stringify(validation.issues));
    }

    return fixture;
  },

  number(identifier = 'quantity'): NumberStep {
    return {
      id: identifier,
      type: StepType.Number,
      content: { title: 'Quantity' },
      input: { name: identifier, min: 0, max: 100, step: 1 },
      validation: { required: true, messages: {} },
    };
  },

  selection(size: number): MultipleSelectionStep {
    return {
      id: 'choices',
      type: StepType.MultiSelect,
      content: { title: 'Choices' },
      input: {
        name: 'choices',
        options: Array.from({ length: size }, (_, index) => ({
          value: `option_${index}`,
          label: `Option ${index}`,
        })),
      },
      validation: { required: true, minSelections: 1, maxSelections: size, messages: {} },
    };
  },

  singleSelection(size: number): SingleSelectionStep {
    const multiple = BenchmarkFixtures.selection(size);

    return {
      ...multiple,
      type: StepType.SingleSelect,
      validation: { required: true, messages: {} },
    };
  },

  references(): FunnelConfiguration {
    const { configuration } = BenchmarkFixtures.funnel(BenchmarkPolicy.ReferenceFunnelSize);
    const selection = BenchmarkFixtures.singleSelection(BenchmarkPolicy.ReferenceCount);
    const stepSequence = [
      'intro',
      'choices',
      ...Object.keys(configuration.steps).filter((identifier) =>
        identifier.startsWith('question_'),
      ),
      'result',
    ];
    const variant = { weight: 50, stepSequence, stepOverrides: {}, resultOverrides: {} };

    return {
      ...configuration,
      steps: { ...configuration.steps, choices: selection },
      resultRules: Array.from({ length: BenchmarkPolicy.ReferenceCount }, () => ({
        resultId: 'balanced',
        when: {
          answer: selection.input.name,
          operator: ConditionOperator.Equal,
          value: `option_${BenchmarkPolicy.ReferenceCount - 1}`,
        },
      })),
      experiment: {
        ...configuration.experiment,
        variants: { A: variant, B: structuredClone(variant) },
      },
    };
  },

  nestedCondition(depth: number): Condition {
    let condition: Condition = {
      answer: 'quantity',
      operator: ConditionOperator.Equal,
      value: BenchmarkPolicy.AnswerValue,
    };

    for (let level = 0; level < depth; level += 1) {
      condition = { all: [condition] };
    }

    return condition;
  },

  hiddenBranch(size: number): BenchmarkFunnel {
    const fixture = BenchmarkFixtures.funnel(size);
    const identifier = `question_${size - 3}`;
    const question = fixture.configuration.steps[identifier];
    assert.ok(question);

    return BenchmarkFixtures.validated({
      ...fixture,
      configuration: {
        ...fixture.configuration,
        steps: {
          ...fixture.configuration.steps,
          [identifier]: {
            ...question,
            visibleWhen: {
              answer: 'question_0',
              operator: ConditionOperator.Equal,
              value: BenchmarkPolicy.UnmatchedValue,
            },
          },
        },
      },
    });
  },

  resultRules(size: number, finalMatch: boolean): BenchmarkFunnel {
    const fixture = BenchmarkFixtures.funnel(BenchmarkPolicy.ReferenceFunnelSize);

    return BenchmarkFixtures.validated({
      ...fixture,
      configuration: {
        ...fixture.configuration,
        resultRules: Array.from({ length: size }, (_, position) => ({
          resultId: 'async_native',
          when: {
            answer: 'question_0',
            operator: ConditionOperator.Equal,
            value:
              finalMatch && position === size - 1
                ? BenchmarkPolicy.AnswerValue
                : BenchmarkPolicy.UnmatchedValue,
          },
        })),
      },
    });
  },

  funnel(size: number): BenchmarkFunnel {
    const original = RuntimeFixtures.configuration(1);
    const introduction = original.steps['intro'];
    const result = original.steps['result'];
    assert.ok(introduction);
    assert.ok(result);
    const steps: Dictionary<string, FunnelStep> = { intro: introduction };
    const answers: Dictionary<string, number> = {};
    const identifiers = Array.from({ length: size - 2 }, (_, index) => `question_${index}`);

    for (const identifier of identifiers) {
      steps[identifier] = BenchmarkFixtures.number(identifier);
      answers[identifier] = BenchmarkPolicy.AnswerValue;
    }

    steps['result'] = result;
    const stepSequence = ['intro', ...identifiers, 'result'];
    const variant = { weight: 50, stepSequence, stepOverrides: {}, resultOverrides: {} };
    const configuration = {
      ...original,
      steps,
      resultRules: [
        {
          resultId: 'balanced',
          when: { answer: 'question_0', operator: ConditionOperator.Equal, value: 1 },
        },
      ],
      experiment: {
        ...original.experiment,
        variants: {
          [ExperimentVariant.A]: variant,
          [ExperimentVariant.B]: structuredClone(variant),
        },
      },
    };
    return BenchmarkFixtures.validated({ configuration, answers });
  },
} as const;
