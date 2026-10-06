import type {
  ExperimentVariant,
  FunnelConfiguration,
  FunnelStep,
  SessionAnswers,
} from '@kelpie/contracts';
import { RouteBuilder } from './route-builder.js';
import { RouteDirection } from './runtime-policy.js';
import type { AvailableRoute } from './runtime-types.js';

function adjacent(
  route: AvailableRoute,
  identifier: string,
  direction: RouteDirection,
): Optional<FunnelStep> {
  const position = route.steps.findIndex((step) => step.id === identifier);

  if (position < 0) {
    return undefined;
  }

  return route.steps[position + direction];
}

export const RouteResolution = Object.freeze({
  /** One ordered traversal: only earlier visible, valid answers activate branches. */
  resolve(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    answers: SessionAnswers,
  ): AvailableRoute {
    return RouteBuilder.resolve(configuration, variant, answers);
  },

  next(route: AvailableRoute, identifier: string): Optional<FunnelStep> {
    return adjacent(route, identifier, RouteDirection.Next);
  },

  previous(route: AvailableRoute, identifier: string): Optional<FunnelStep> {
    return adjacent(route, identifier, RouteDirection.Previous);
  },
});
