import assert from 'node:assert/strict';
import { TrafficCoverage } from './traffic-coverage.js';
import { Ajv } from 'ajv';
import { Type } from 'typebox';
import { isNull, isUndefined } from 'es-toolkit/predicate';
import type { AnalyticsResponse } from '../../../source/analytics/analytics-response.js';
import { TrafficOracleMessages } from './traffic-oracle-messages.js';
import {
  TrafficSessionManifestSchema,
  type TrafficSessionManifest,
  type TrafficOracleSelection,
  type TrafficCoverageSpecification,
} from './traffic-oracle-types.js';

const manifestValidator = new Ajv({ strict: true }).compile<TrafficSessionManifest[]>(
  Type.Array(TrafficSessionManifestSchema),
);

export const TrafficOracle = {
  validate(input: unknown): TrafficSessionManifest[] {
    assert.ok(manifestValidator(input), TrafficOracleMessages.InvalidManifest);
    assert.equal(
      new Set(input.map((session) => session.sessionIdentifier)).size,
      input.length,
      TrafficOracleMessages.DuplicateSession,
    );

    assert.equal(new Set(input.map((session) => session.index)).size, input.length);

    return input;
  },

  select(
    manifest: readonly TrafficSessionManifest[],
    selection: TrafficOracleSelection,
  ): TrafficSessionManifest[] {
    return manifest.filter(
      (session) =>
        (selection.includeForced || !session.forced) &&
        (isUndefined(selection.versionIdentifier) ||
          session.versionIdentifier === selection.versionIdentifier) &&
        (isUndefined(selection.variant) || session.variant === selection.variant) &&
        (isUndefined(selection.campaign) || session.acquisition.campaign === selection.campaign) &&
        (isUndefined(selection.source) || session.acquisition.source === selection.source) &&
        (isUndefined(selection.medium) || session.acquisition.medium === selection.medium),
    );
  },

  ratio(numerator: number, denominator: number) {
    return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
  },

  summary(sessions: readonly TrafficSessionManifest[]) {
    const results = sessions.filter((session) => session.resultViewed).length;
    const clicks = sessions.filter((session) => session.recommendationClicked).length;
    const resultClicks = sessions.filter(
      (session) => session.resultViewed && session.recommendationClicked,
    ).length;

    return {
      started: sessions.length,
      resultCompletion: TrafficOracle.ratio(results, sessions.length),
      ctaConversion: TrafficOracle.ratio(clicks, sessions.length),
      ctaClickThrough: TrafficOracle.ratio(resultClicks, results),
    };
  },

  step(sessions: readonly TrafficSessionManifest[], stepIdentifier: string) {
    const reached = sessions.filter((session) => session.viewedSteps.includes(stepIdentifier));
    const completed = sessions.filter((session) => session.submittedSteps.includes(stepIdentifier));
    const observedCompleted = reached.filter((session) =>
      session.submittedSteps.includes(stepIdentifier),
    );
    const uncompleted = reached.filter(
      (session) => !session.submittedSteps.includes(stepIdentifier),
    );
    const expired = uncompleted.filter((session) => session.expired).length;

    return {
      reached: reached.length,
      completed: completed.length,
      completion: TrafficOracle.ratio(observedCompleted.length, reached.length),
      noncompletion: { open: uncompleted.length - expired, expired },
      expiredDropout: TrafficOracle.ratio(
        expired,
        reached.filter((session) => session.expired).length,
      ),
    };
  },

  edge(
    sessions: readonly TrafficSessionManifest[],
    fromStepIdentifier: string,
    toStepIdentifier: string,
  ) {
    const transitioned = sessions.filter((session) =>
      session.transitions.some(
        (transition) =>
          transition.fromStepIdentifier === fromStepIdentifier &&
          transition.toStepIdentifier === toStepIdentifier,
      ),
    );
    const destinationViewed = transitioned.filter((session) =>
      session.viewedSteps.includes(toStepIdentifier),
    );
    const bothViewed = destinationViewed.filter((session) =>
      session.viewedSteps.includes(fromStepIdentifier),
    );
    const missingDestination = transitioned.filter(
      (session) => !session.viewedSteps.includes(toStepIdentifier),
    );
    const expired = missingDestination.filter((session) => session.expired).length;

    return {
      transitions: transitioned.length,
      observedConversion: TrafficOracle.ratio(
        bothViewed.length,
        sessions.filter((session) => session.viewedSteps.includes(fromStepIdentifier)).length,
      ),
      branchShare: TrafficOracle.ratio(
        transitioned.length,
        sessions.filter((session) => session.submittedSteps.includes(fromStepIdentifier)).length,
      ),
      transitionToView: TrafficOracle.ratio(destinationViewed.length, transitioned.length),
      destinationNonreach: { open: missingDestination.length - expired, expired },
    };
  },

  verifyCoverage(
    manifest: readonly TrafficSessionManifest[],
    specifications: readonly TrafficCoverageSpecification[],
  ): void {
    TrafficOracle.validate(manifest);
    TrafficCoverage.verify(manifest, specifications);
  },

  coverage(manifest: readonly TrafficSessionManifest[]) {
    const groups = new Map<string, TrafficSessionManifest[]>();

    for (const session of manifest) {
      const key = `${session.version}:${session.variant}`;
      const group = groups.get(key) ?? [];
      group.push(session);
      groups.set(key, group);
    }

    return {
      sessions: manifest.length,
      completed: manifest.filter((session) => session.completed).length,
      incomplete: manifest.filter((session) => !session.completed).length,
      forced: manifest.filter((session) => session.forced).length,
      random: manifest.filter((session) => !session.forced).length,
      missingStepViews: manifest.reduce(
        (count, session) =>
          count +
          new Set(session.submittedSteps.filter((step) => !session.viewedSteps.includes(step)))
            .size,
        0,
      ),
      replayedEvents: manifest.reduce((count, session) => count + session.replayedEvents, 0),
      rejectedEvents: manifest.reduce((count, session) => count + session.rejectedEvents, 0),
      backChanges: manifest.reduce((count, session) => count + session.backChanges, 0),
      groups: [...groups.entries()]
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([group, sessions]) => ({
          group,
          started: sessions.length,
          completed: sessions.filter((session) => session.completed).length,
          incomplete: sessions.filter((session) => !session.completed).length,
          results: [
            ...new Set(
              sessions.flatMap((session) =>
                isNull(session.resultIdentifier) ? [] : [session.resultIdentifier],
              ),
            ),
          ].sort(),
          submittedSteps: [
            ...new Set(sessions.flatMap((session) => session.submittedSteps)),
          ].sort(),
          campaigns: [...new Set(sessions.map((session) => session.acquisition.campaign))].sort(),
          recommendationClicked: sessions.filter((session) => session.recommendationClicked).length,
        })),
    };
  },

  verify(
    manifest: readonly TrafficSessionManifest[],
    response: AnalyticsResponse,
    selection: TrafficOracleSelection,
  ): void {
    assert.equal(response.pagination.hasMore, false, TrafficOracleMessages.UnexpectedPagination);
    assert.equal(response.filters.trafficOrigin, 'synthetic');
    assert.equal(response.filters.includeForced, selection.includeForced);
    assert.equal(response.filters.versionIdentifier, selection.versionIdentifier);
    assert.equal(response.filters.campaign, selection.campaign);
    assert.equal(response.filters.source, selection.source);
    assert.equal(response.filters.medium, selection.medium);
    assert.equal(response.filters.conversionWindowHours, undefined);
    assert.equal(response.filters.from, undefined);
    assert.equal(response.filters.to, undefined);
    const selected = TrafficOracle.select(manifest, selection);
    const actualGroups = new Set(
      response.versions.flatMap((version) =>
        version.variants.map((variant) => `${version.versionIdentifier}:${variant.variant}`),
      ),
    );

    assert.equal(
      actualGroups.size,
      response.versions.reduce((count, version) => count + version.variants.length, 0),
    );

    for (const session of selected) {
      assert.ok(
        actualGroups.has(`${session.versionIdentifier}:${session.variant}`),
        TrafficOracleMessages.MissingGroup,
      );
    }

    for (const version of response.versions) {
      for (const variant of version.variants) {
        const sessions = selected.filter(
          (session) =>
            session.versionIdentifier === version.versionIdentifier &&
            session.variant === variant.variant,
        );
        assert.ok(sessions.every((session) => session.version === version.funnelVersion));
        const { started, resultCompletion, ctaConversion, ctaClickThrough } = variant;
        assert.deepEqual(
          { started, resultCompletion, ctaConversion, ctaClickThrough },
          TrafficOracle.summary(sessions),
        );
        const actualSteps = new Set(variant.steps.map((step) => step.stepIdentifier));
        assert.equal(actualSteps.size, variant.steps.length);

        for (const identifier of new Set(
          sessions.flatMap((session) => [...session.viewedSteps, ...session.submittedSteps]),
        )) {
          assert.ok(actualSteps.has(identifier));
        }

        const actualEdges = new Set(
          variant.edges.map((edge) => `${edge.fromStepIdentifier}:${edge.toStepIdentifier}`),
        );

        assert.equal(actualEdges.size, variant.edges.length);

        for (const transition of sessions.flatMap((session) => session.transitions)) {
          assert.ok(
            actualEdges.has(`${transition.fromStepIdentifier}:${transition.toStepIdentifier}`),
          );
        }

        for (const edge of variant.edges) {
          const { fromStepIdentifier, toStepIdentifier, ...metrics } = edge;
          assert.deepEqual(
            metrics,
            TrafficOracle.edge(sessions, fromStepIdentifier, toStepIdentifier),
          );
        }

        for (const step of variant.steps) {
          const expected = TrafficOracle.step(sessions, step.stepIdentifier);
          assert.equal(step.reached, expected.reached);

          if (step.type !== 'result') {
            const { reached, completed, completion, noncompletion, expiredDropout } = step;
            assert.deepEqual(
              { reached, completed, completion, noncompletion, expiredDropout },
              expected,
            );
          }
        }
      }
    }
  },
};
