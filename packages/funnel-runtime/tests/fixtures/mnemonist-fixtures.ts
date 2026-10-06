import type { MultipleSelectionStep } from '@kelpie/contracts';
import { DefaultMap, set, Stack } from 'mnemonist';
import { MnemonistPolicy } from '../benchmarks/mnemonist-policy.js';
import type {
  SelectionMembershipResult,
  SelectionMembershipScenario,
  TraversalPayload,
} from '../benchmarks/mnemonist-types.js';

export const MnemonistFixtures = {
  selections(step: MultipleSelectionStep): ReadonlyList<SelectionMembershipScenario> {
    const answers = step.input.options.map((option) => option.value);

    return [
      { name: 'valid', answers, expected: { duplicate: false, unavailable: false } },
      {
        name: 'duplicate',
        answers: answers.map(() => 'option_0'),
        expected: { duplicate: true, unavailable: false },
      },
      {
        name: 'missing-tail',
        answers: [...answers.slice(1), MnemonistPolicy.MissingOption],
        expected: { duplicate: false, unavailable: true },
      },
    ];
  },

  nativeMembership(
    step: MultipleSelectionStep,
    answers: ReadonlyList<string>,
  ): SelectionMembershipResult {
    const selectedValues = new Set(answers);
    const optionValues = new Set(step.input.options.map((option) => option.value));

    return {
      duplicate: selectedValues.size !== answers.length,
      unavailable: answers.some((value) => !optionValues.has(value)),
    };
  },

  mnemonistMembership(
    step: MultipleSelectionStep,
    answers: ReadonlyList<string>,
  ): SelectionMembershipResult {
    const selectedValues = new Set(answers);
    const optionValues = new Set(step.input.options.map((option) => option.value));

    return {
      duplicate: selectedValues.size !== answers.length,
      unavailable: !set.isSubset(selectedValues, optionValues),
    };
  },

  nativeReferences(step: MultipleSelectionStep, referenceCount: number): number {
    const indexes = new Map<MultipleSelectionStep, ReadonlySet<string>>();
    let matches = 0;

    for (let reference = 0; reference < referenceCount; reference += 1) {
      let values = indexes.get(step);

      if (values === undefined) {
        values = new Set(step.input.options.map((option) => option.value));
        indexes.set(step, values);
      }

      matches += Number(values.has(`option_${step.input.options.length - 1}`));
    }

    return matches;
  },

  mnemonistReferences(step: MultipleSelectionStep, referenceCount: number): number {
    const indexes = new DefaultMap<MultipleSelectionStep, ReadonlySet<string>>(
      (selection) => new Set(selection.input.options.map((option) => option.value)),
    );
    let matches = 0;

    for (let reference = 0; reference < referenceCount; reference += 1) {
      const values = indexes.get(step);
      matches += Number(values.has(`option_${step.input.options.length - 1}`));
    }

    return matches;
  },

  traversal(size: number): ReadonlyList<TraversalPayload> {
    return Array.from({ length: size }, (_, position) => ({
      position,
      value: { identifier: `node_${position}` },
    }));
  },

  nativeStack(payloads: ReadonlyList<TraversalPayload>): number {
    const pending: TraversalPayload[] = [];

    for (const payload of payloads) {
      pending.push(payload);
    }

    let checksum = 0;
    let processedCount = 0;
    let current = pending.pop();

    while (current !== undefined) {
      processedCount += 1;
      checksum += current.position * processedCount;
      current = pending.pop();
    }

    return checksum;
  },

  mnemonistStack(payloads: ReadonlyList<TraversalPayload>): number {
    const pending = new Stack<TraversalPayload>();

    for (const payload of payloads) {
      pending.push(payload);
    }

    let checksum = 0;
    let processedCount = 0;
    let current = pending.pop();

    while (current !== undefined) {
      processedCount += 1;
      checksum += current.position * processedCount;
      current = pending.pop();
    }

    return checksum;
  },
} as const;
