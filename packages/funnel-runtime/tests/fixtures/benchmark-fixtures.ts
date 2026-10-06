import assert from 'node:assert/strict';
import {
  ConditionOperator,
  ExperimentVariant,
  FunnelConfigurations,
  StepType,
  type FunnelStep,
  type FunnelConfiguration,
  type MultipleSelectionStep,
  type NumberStep,
  type SingleSelectionStep,
} from '@kelpie/contracts';
import type { BenchmarkFunnel } from '../benchmarks/benchmark-types.js';
import { BenchmarkPolicy } from '../benchmarks/benchmark-policy.js';
import { RuntimeFixtures } from './runtime-fixtures.js';

export const BenchmarkFixtures = {
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
    const validation = FunnelConfigurations.validate(configuration);

    if (!validation.valid) {
      assert.fail(JSON.stringify(validation.issues));
    }

    return { configuration: validation.configuration, answers };
  },
} as const;
