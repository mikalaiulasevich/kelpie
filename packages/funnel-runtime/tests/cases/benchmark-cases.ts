import assert from 'node:assert/strict';
import { omit } from 'es-toolkit/object';
import {
  ConditionOperator,
  ExperimentVariant,
  FunnelConfigurations,
  type Condition,
} from '@kelpie/contracts';
import { FunnelRuntime } from '@kelpie/funnel-runtime';
import { BenchmarkPolicy } from '../benchmarks/benchmark-policy.js';
import type { BenchmarkCase } from '../benchmarks/benchmark-types.js';
import { BenchmarkFixtures } from '../fixtures/benchmark-fixtures.js';
import { RuntimeAnswers, RuntimeFixtures } from '../fixtures/runtime-fixtures.js';

const BenchmarkCaseFactory = {
  checked(
    name: string,
    size: number,
    iterations: number,
    run: () => unknown,
    expected: unknown,
  ): BenchmarkCase {
    return { name, size, iterations, run, verify: () => assert.deepEqual(run(), expected) };
  },

  funnels(size: number): ReadonlyList<BenchmarkCase> {
    const { configuration, answers } = BenchmarkFixtures.funnel(size);
    const invalidConfiguration = { ...configuration, defaultResultId: 'missing_result' };
    const variant = ExperimentVariant.A;
    const route = FunnelRuntime.Routes.resolve(configuration, variant, answers);
    const iterations = BenchmarkPolicy.ComplexIterations;
    const lastQuestionIdentifier = `question_${size - 3}`;

    return [
      BenchmarkCaseFactory.checked(
        'configuration.valid',
        size,
        iterations,
        () => FunnelConfigurations.validate(configuration).valid,
        true,
      ),
      BenchmarkCaseFactory.checked(
        'configuration.invalid-reference',
        size,
        iterations,
        () => FunnelConfigurations.validate(invalidConfiguration).valid,
        false,
      ),
      BenchmarkCaseFactory.checked(
        'experiment.resolve',
        size,
        iterations,
        () => FunnelRuntime.Experiments.resolve(configuration, variant).stepSequence.length,
        size,
      ),
      BenchmarkCaseFactory.checked(
        'route.resolve',
        size,
        iterations,
        () => FunnelRuntime.Routes.resolve(configuration, variant, answers).completedQuestionCount,
        size - 2,
      ),
      BenchmarkCaseFactory.checked(
        'result.resolve',
        size,
        iterations,
        () => FunnelRuntime.Results.resolve(configuration, variant, answers)?.id,
        'balanced',
      ),
      BenchmarkCaseFactory.checked(
        'funnel.evaluate',
        size,
        iterations,
        () => FunnelRuntime.Evaluation.evaluate(configuration, variant, answers).result?.id,
        'balanced',
      ),
      BenchmarkCaseFactory.checked(
        'route.next-tail',
        size,
        BenchmarkPolicy.SimpleIterations,
        () => FunnelRuntime.Routes.next(route, lastQuestionIdentifier)?.id,
        'result',
      ),
      BenchmarkCaseFactory.checked(
        'route.previous-tail',
        size,
        BenchmarkPolicy.SimpleIterations,
        () => FunnelRuntime.Routes.previous(route, 'result')?.id,
        lastQuestionIdentifier,
      ),
    ];
  },

  selections(size: number): ReadonlyList<BenchmarkCase> {
    const single = BenchmarkFixtures.singleSelection(size);
    const multiple = BenchmarkFixtures.selection(size);
    const validSelections = multiple.input.options.map((option) => option.value);
    const oversizedSelections = [...validSelections, 'overflow_option'];
    const duplicateSelections = validSelections.map(() => 'option_0');
    const invalidSelections = [...validSelections.slice(1), 'missing_option'];
    const iterations = BenchmarkPolicy.SimpleIterations;
    const lastOption = `option_${size - 1}`;

    return [
      BenchmarkCaseFactory.checked(
        'answer.single-valid-tail',
        size,
        iterations,
        () => FunnelRuntime.Answers.validate(single, lastOption).valid,
        true,
      ),
      BenchmarkCaseFactory.checked(
        'answer.single-invalid',
        size,
        iterations,
        () => FunnelRuntime.Answers.validate(single, 'missing_option').valid,
        false,
      ),
      BenchmarkCaseFactory.checked(
        'answer.multiple-valid',
        size,
        iterations,
        () => FunnelRuntime.Answers.validate(multiple, validSelections).valid,
        true,
      ),
      BenchmarkCaseFactory.checked(
        'answer.multiple-oversized',
        size,
        iterations,
        () => FunnelRuntime.Answers.validate(multiple, oversizedSelections).valid,
        false,
      ),
      BenchmarkCaseFactory.checked(
        'answer.multiple-duplicate',
        size,
        iterations,
        () => FunnelRuntime.Answers.validate(multiple, duplicateSelections).valid,
        false,
      ),
      BenchmarkCaseFactory.checked(
        'answer.multiple-invalid',
        size,
        iterations,
        () => FunnelRuntime.Answers.validate(multiple, invalidSelections).valid,
        false,
      ),
    ];
  },

  conditions(size: number): ReadonlyList<BenchmarkCase> {
    const matching: Condition = {
      answer: 'quantity',
      operator: ConditionOperator.Equal,
      value: BenchmarkPolicy.AnswerValue,
    };
    const missing: Condition = {
      answer: 'quantity',
      operator: ConditionOperator.Equal,
      value: BenchmarkPolicy.UnmatchedValue,
    };
    const matchingChildren = Array.from({ length: size }, () => matching);
    const missingChildren = Array.from({ length: size }, () => missing);
    const answers = { quantity: BenchmarkPolicy.AnswerValue };
    const iterations = BenchmarkPolicy.SimpleIterations;
    const allEarly: Condition = { all: [missing, ...matchingChildren.slice(1)] };
    const allWorst: Condition = { all: matchingChildren };
    const anyEarly: Condition = { any: [matching, ...missingChildren.slice(1)] };
    const anyWorst: Condition = { any: missingChildren };

    return [
      BenchmarkCaseFactory.checked(
        'condition.all-early',
        size,
        iterations,
        () => FunnelRuntime.Conditions.evaluate(allEarly, answers),
        false,
      ),
      BenchmarkCaseFactory.checked(
        'condition.all-worst',
        size,
        iterations,
        () => FunnelRuntime.Conditions.evaluate(allWorst, answers),
        true,
      ),
      BenchmarkCaseFactory.checked(
        'condition.any-early',
        size,
        iterations,
        () => FunnelRuntime.Conditions.evaluate(anyEarly, answers),
        true,
      ),
      BenchmarkCaseFactory.checked(
        'condition.any-worst',
        size,
        iterations,
        () => FunnelRuntime.Conditions.evaluate(anyWorst, answers),
        false,
      ),
    ];
  },

  memberships(size: number): ReadonlyList<BenchmarkCase> {
    const values = Array.from({ length: size }, (_, position) => `option_${position}`);
    const answer = values.at(-1);
    assert.ok(answer);
    const included: Condition = {
      answer: 'choice',
      operator: ConditionOperator.In,
      value: values,
    };
    const contains: Condition = {
      answer: 'choices',
      operator: ConditionOperator.Contains,
      value: answer,
    };
    const singleAnswer = { choice: answer };
    const multipleAnswers = { choices: values };

    return [
      BenchmarkCaseFactory.checked(
        'condition.in-tail',
        size,
        BenchmarkPolicy.SimpleIterations,
        () => FunnelRuntime.Conditions.evaluate(included, singleAnswer),
        true,
      ),
      BenchmarkCaseFactory.checked(
        'condition.contains-tail',
        size,
        BenchmarkPolicy.SimpleIterations,
        () => FunnelRuntime.Conditions.evaluate(contains, multipleAnswers),
        true,
      ),
    ];
  },

  nested(depth: number): BenchmarkCase {
    const condition = BenchmarkFixtures.nestedCondition(depth);
    const answers = { quantity: BenchmarkPolicy.AnswerValue };

    return BenchmarkCaseFactory.checked(
      'condition.nested-all',
      depth,
      BenchmarkPolicy.SimpleIterations,
      () => FunnelRuntime.Conditions.evaluate(condition, answers),
      true,
    );
  },

  branches(size: number): ReadonlyList<BenchmarkCase> {
    const hidden = BenchmarkFixtures.hiddenBranch(size);
    const { configuration, answers } = BenchmarkFixtures.funnel(size);
    const incompleteAnswers = omit(answers, ['question_0']);
    const variant = ExperimentVariant.A;

    return [
      BenchmarkCaseFactory.checked(
        'route.hidden-branch',
        size,
        BenchmarkPolicy.ComplexIterations,
        () =>
          FunnelRuntime.Routes.resolve(hidden.configuration, variant, hidden.answers).steps.length,
        size - 1,
      ),
      BenchmarkCaseFactory.checked(
        'funnel.incomplete',
        size,
        BenchmarkPolicy.ComplexIterations,
        () => FunnelRuntime.Evaluation.evaluate(configuration, variant, incompleteAnswers).result,
        undefined,
      ),
    ];
  },

  resultRules(size: number): ReadonlyList<BenchmarkCase> {
    const finalMatch = BenchmarkFixtures.resultRules(size, true);
    const noMatch = BenchmarkFixtures.resultRules(size, false);
    const variant = ExperimentVariant.A;

    return [
      BenchmarkCaseFactory.checked(
        'result.last-rule',
        size,
        BenchmarkPolicy.ComplexIterations,
        () =>
          FunnelRuntime.Results.resolve(finalMatch.configuration, variant, finalMatch.answers)?.id,
        'async_native',
      ),
      BenchmarkCaseFactory.checked(
        'result.no-rule',
        size,
        BenchmarkPolicy.ComplexIterations,
        () => FunnelRuntime.Results.resolve(noMatch.configuration, variant, noMatch.answers)?.id,
        'balanced',
      ),
    ];
  },

  historical(version: number): ReadonlyList<BenchmarkCase> {
    const configuration = RuntimeFixtures.configuration(version);
    const answers = RuntimeAnswers.complete();

    return Object.values(ExperimentVariant).map((variant) =>
      BenchmarkCaseFactory.checked(
        `historical.v${version}.${variant}`,
        Object.keys(configuration.steps).length,
        BenchmarkPolicy.ComplexIterations,
        () => FunnelRuntime.Evaluation.evaluate(configuration, variant, answers).result?.id,
        'balanced',
      ),
    );
  },

  references(): BenchmarkCase {
    const document = BenchmarkFixtures.references();

    return BenchmarkCaseFactory.checked(
      'configuration.repeated-selection-references',
      BenchmarkPolicy.ReferenceCount,
      BenchmarkPolicy.ComplexIterations,
      () => FunnelConfigurations.validate(document).valid,
      true,
    );
  },
} as const;

export const BenchmarkCases = {
  create(): ReadonlyList<BenchmarkCase> {
    const number = BenchmarkFixtures.number();

    return [
      ...BenchmarkPolicy.FunnelSizes.flatMap(BenchmarkCaseFactory.funnels),
      ...BenchmarkPolicy.FunnelSizes.flatMap(BenchmarkCaseFactory.selections),
      ...BenchmarkPolicy.ConditionSizes.flatMap(BenchmarkCaseFactory.conditions),
      ...BenchmarkPolicy.FunnelSizes.flatMap(BenchmarkCaseFactory.memberships),
      ...BenchmarkPolicy.ConditionDepths.map(BenchmarkCaseFactory.nested),
      ...BenchmarkPolicy.FunnelSizes.flatMap(BenchmarkCaseFactory.branches),
      ...BenchmarkPolicy.FunnelSizes.flatMap(BenchmarkCaseFactory.resultRules),
      ...BenchmarkPolicy.HistoricalVersions.flatMap(BenchmarkCaseFactory.historical),
      BenchmarkCaseFactory.checked(
        'answer.number-valid',
        1,
        BenchmarkPolicy.SimpleIterations,
        () => FunnelRuntime.Answers.validate(number, BenchmarkPolicy.AnswerValue).valid,
        true,
      ),
      BenchmarkCaseFactory.checked(
        'answer.number-invalid',
        1,
        BenchmarkPolicy.SimpleIterations,
        () => FunnelRuntime.Answers.validate(number, BenchmarkPolicy.InvalidAnswer).valid,
        false,
      ),
      BenchmarkCaseFactory.references(),
    ];
  },
} as const;
