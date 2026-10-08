import assert from 'node:assert/strict';
import type {
  TrafficCoverageSpecification,
  TrafficSessionManifest,
} from './traffic-oracle-types.js';
import { TrafficOracleMessages } from './traffic-oracle-messages.js';

export const TrafficCoverage = {
  require(condition: boolean, group: string, requirement: string): void {
    assert.ok(condition, TrafficOracleMessages.coverage(group, requirement));
  },

  group(
    sessions: readonly TrafficSessionManifest[],
    specification: TrafficCoverageSpecification,
    variant: string,
  ): void {
    const group = `v${specification.version}/${variant}`;
    const completed = sessions.filter((session) => session.completed);
    TrafficCoverage.require(completed.length > 0, group, 'completed sessions');
    TrafficCoverage.require(
      sessions.some((session) => !session.completed),
      group,
      'incomplete sessions',
    );

    for (const forced of [false, true]) {
      for (const finished of [false, true]) {
        TrafficCoverage.require(
          sessions.some((session) => session.forced === forced && session.completed === finished),
          group,
          `${forced ? 'forced' : 'random'} assignment with ${finished ? 'completion' : 'dropout'}`,
        );
      }
    }

    for (const resultIdentifier of specification.resultIdentifiers) {
      TrafficCoverage.require(
        completed.some((session) => session.resultIdentifier === resultIdentifier),
        group,
        `result ${resultIdentifier}`,
      );
    }

    for (const stepIdentifier of specification.conditionalStepIdentifiers) {
      TrafficCoverage.require(
        completed.some((session) => session.submittedSteps.includes(stepIdentifier)),
        group,
        `taken branch ${stepIdentifier}`,
      );
      TrafficCoverage.require(
        completed.some((session) => !session.submittedSteps.includes(stepIdentifier)),
        group,
        `skipped branch ${stepIdentifier}`,
      );
    }

    TrafficCoverage.require(
      new Set(sessions.map((session) => session.acquisition.campaign)).size > 1,
      group,
      'multiple campaigns',
    );
    TrafficCoverage.require(
      completed.some((session) => session.recommendationClicked),
      group,
      'recommendation click',
    );
    TrafficCoverage.require(
      completed.some((session) => !session.recommendationClicked),
      group,
      'result without recommendation click',
    );
  },

  verify(
    manifest: readonly TrafficSessionManifest[],
    specifications: readonly TrafficCoverageSpecification[],
  ): void {
    assert.equal(specifications.length, 3);
    assert.equal(new Set(specifications.map((specification) => specification.version)).size, 3);

    for (const specification of specifications) {
      assert.deepEqual([...specification.variants].sort(), ['A', 'B']);

      for (const variant of specification.variants) {
        TrafficCoverage.group(
          manifest.filter(
            (session) => session.version === specification.version && session.variant === variant,
          ),
          specification,
          variant,
        );
      }
    }

    TrafficCoverage.require(
      manifest.some((session) => session.replayedEvents > 0),
      'whole run',
      'replayed events',
    );
    TrafficCoverage.require(
      manifest.some((session) => session.rejectedEvents > 0),
      'whole run',
      'rejected events',
    );
    TrafficCoverage.require(
      manifest.some((session) => session.backChanges > 0),
      'whole run',
      'Back changes',
    );
    TrafficCoverage.require(
      manifest.some((session) =>
        session.submittedSteps.some((step) => !session.viewedSteps.includes(step)),
      ),
      'whole run',
      'completion without recorded step view',
    );
  },
};
