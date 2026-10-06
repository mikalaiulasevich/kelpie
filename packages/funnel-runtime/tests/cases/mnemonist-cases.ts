import assert from 'node:assert/strict';
import { BenchmarkPolicy } from '../benchmarks/benchmark-policy.js';
import type { BenchmarkCase } from '../benchmarks/benchmark-types.js';
import { MnemonistPolicy } from '../benchmarks/mnemonist-policy.js';
import type { SelectionMembershipImplementation } from '../benchmarks/mnemonist-types.js';
import { BenchmarkFixtures } from '../fixtures/benchmark-fixtures.js';
import { MnemonistFixtures } from '../fixtures/mnemonist-fixtures.js';

const MembershipImplementations: ReadonlyList<SelectionMembershipImplementation> = [
  { name: 'native', run: MnemonistFixtures.nativeMembership },
  { name: 'mnemonist', run: MnemonistFixtures.mnemonistMembership },
];

const MnemonistCaseFactory = {
  checked(name: string, size: number, run: () => unknown, expected: unknown): BenchmarkCase {
    return {
      name,
      size,
      iterations: BenchmarkPolicy.SimpleIterations,
      run,
      verify: () => assert.deepEqual(run(), expected),
    };
  },

  selections(size: number): ReadonlyList<BenchmarkCase> {
    const step = BenchmarkFixtures.selection(size);

    return MnemonistFixtures.selections(step).flatMap((scenario) =>
      MembershipImplementations.map((implementation) =>
        MnemonistCaseFactory.checked(
          `membership.${scenario.name}.${implementation.name}`,
          size,
          () => implementation.run(step, scenario.answers),
          scenario.expected,
        ),
      ),
    );
  },

  references(size: number): ReadonlyList<BenchmarkCase> {
    const step = BenchmarkFixtures.selection(size);

    return MnemonistPolicy.ReferenceCounts.flatMap((referenceCount) => [
      MnemonistCaseFactory.checked(
        `option-index.references-${referenceCount}.native`,
        size,
        () => MnemonistFixtures.nativeReferences(step, referenceCount),
        referenceCount,
      ),
      MnemonistCaseFactory.checked(
        `option-index.references-${referenceCount}.mnemonist`,
        size,
        () => MnemonistFixtures.mnemonistReferences(step, referenceCount),
        referenceCount,
      ),
    ]);
  },

  stacks(size: number): ReadonlyList<BenchmarkCase> {
    const payloads = MnemonistFixtures.traversal(size);
    // Weighted reverse order catches a FIFO substitution, unlike an unordered sum.
    const expected = (size * (size - 1) * (size + 1)) / 6;

    return [
      MnemonistCaseFactory.checked(
        'traversal-stack.native',
        size,
        () => MnemonistFixtures.nativeStack(payloads),
        expected,
      ),
      MnemonistCaseFactory.checked(
        'traversal-stack.mnemonist',
        size,
        () => MnemonistFixtures.mnemonistStack(payloads),
        expected,
      ),
    ];
  },
} as const;

export const MnemonistCases = {
  create(): ReadonlyList<BenchmarkCase> {
    return [
      ...MnemonistPolicy.SelectionSizes.flatMap(MnemonistCaseFactory.selections),
      ...MnemonistPolicy.SelectionSizes.flatMap(MnemonistCaseFactory.references),
      ...MnemonistPolicy.StackSizes.flatMap(MnemonistCaseFactory.stacks),
    ];
  },
} as const;
