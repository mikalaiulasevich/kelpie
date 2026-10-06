import { describe, expect, it } from 'vitest';
import { ExperimentVariant } from '@kelpie/contracts';
import { RouteCases } from '../cases/route-cases.js';
import { FunnelRuntime, RouteResolution } from '../../source/index.js';
import { RuntimeFixtures, RuntimeAnswers } from '../fixtures/runtime-fixtures.js';

describe('routes', () => {
  it.each(RouteCases.progressExclusions)(
    'preserves routing with $description',
    ({ excludedTypes, questionCount, completedQuestionCount }) => {
      const answers = RuntimeAnswers.complete();
      const configuration = RuntimeFixtures.progressConfiguration(excludedTypes);
      const original = RouteResolution.resolve(
        RuntimeFixtures.configuration(1),
        ExperimentVariant.A,
        answers,
      );

      const route = RouteResolution.resolve(configuration, ExperimentVariant.A, answers);

      expect(route.questionCount).toBe(questionCount);
      expect(route.completedQuestionCount).toBe(completedQuestionCount);
      expect(route.steps).toEqual(original.steps);
      expect(route.activeAnswers).toEqual(original.activeAnswers);
    },
  );

  it('keeps route state isolated across repeated resolutions and variants', () => {
    const document = RuntimeFixtures.configuration(1);
    const originalDocument = structuredClone(document);
    const answers = RuntimeAnswers.complete();
    const originalAnswers = structuredClone(answers);
    const firstRoute = FunnelRuntime.Routes.resolve(document, ExperimentVariant.A, answers);
    const firstSnapshot = structuredClone(firstRoute);
    const emptyRoute = FunnelRuntime.Routes.resolve(document, ExperimentVariant.B, {});
    const repeatedRoute = FunnelRuntime.Routes.resolve(document, ExperimentVariant.A, answers);

    expect(emptyRoute.activeAnswers).toEqual({});
    expect(emptyRoute.completedQuestionCount).toBe(0);
    expect(firstRoute).toEqual(firstSnapshot);
    expect(repeatedRoute).toEqual(firstSnapshot);
    expect(repeatedRoute.steps).not.toBe(firstRoute.steps);
    expect(repeatedRoute.activeAnswers).not.toBe(firstRoute.activeAnswers);
    expect(document).toEqual(originalDocument);
    expect(answers).toEqual(originalAnswers);
  });

  it('omits office days for remote work and excludes retained answers', () => {
    const route = RouteResolution.resolve(
      RuntimeFixtures.configuration(1),
      ExperimentVariant.A,
      RuntimeAnswers.complete(),
    );

    expect(route.steps.some((step) => step.id === 'office_days')).toBe(false);
    expect(route.activeAnswers['office_days']).toBeUndefined();
    expect(route.questionCount).toBe(6);
    expect(route.completedQuestionCount).toBe(6);
  });

  it('restores the available office branch when the user changes work mode', () => {
    const route = RouteResolution.resolve(
      RuntimeFixtures.configuration(1),
      ExperimentVariant.A,
      RuntimeAnswers.complete({ work_mode: 'hybrid' }),
    );

    expect(route.activeAnswers['office_days']).toBe(2);
    expect(route.questionCount).toBe(7);
    expect(RouteResolution.next(route, 'timezone_span')?.id).toBe('office_days');
    expect(RouteResolution.previous(route, 'office_days')?.id).toBe('timezone_span');
    expect(RouteResolution.next(route, 'unknown')).toBeUndefined();
  });

  it('excludes tool_count in version three variant B', () => {
    const route = RouteResolution.resolve(
      RuntimeFixtures.configuration(3),
      ExperimentVariant.B,
      RuntimeAnswers.complete(),
    );

    expect(route.activeAnswers['tool_count']).toBeUndefined();
    expect(route.steps.some((step) => step.id === 'tool_count')).toBe(false);
  });

  it('does not let invalid answers activate branches', () => {
    const answers = RuntimeAnswers.complete({
      priorities: ['compliance', 'unknown'],
      security_constraints: 'regulated',
    });

    const route = RouteResolution.resolve(
      RuntimeFixtures.configuration(3),
      ExperimentVariant.A,
      answers,
    );

    expect(route.activeAnswers['security_constraints']).toBeUndefined();
  });
});
