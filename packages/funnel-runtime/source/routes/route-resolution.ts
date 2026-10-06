import type {
  ExperimentVariant,
  FunnelConfiguration,
  FunnelStep,
  SessionAnswers,
} from '@kelpie/contracts';
import { RouteBuilder } from './route-builder.js';
import { RouteDirection } from './route-direction.js';
import type { AvailableRoute } from './route-types.js';

const RouteNavigation = {
  adjacent(
    route: AvailableRoute,
    identifier: string,
    direction: RouteDirection,
  ): Optional<FunnelStep> {
    const position = route.steps.findIndex((step) => step.id === identifier);

    if (position < 0) {
      return undefined;
    }

    return route.steps[position + direction];
  },
} as const;

export const RouteResolution = {
  /** One ordered traversal: only earlier visible, valid answers activate branches. */
  resolve(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    answers: SessionAnswers,
  ): AvailableRoute {
    return RouteBuilder.resolve(configuration, variant, answers);
  },

  next(route: AvailableRoute, identifier: string): Optional<FunnelStep> {
    return RouteNavigation.adjacent(route, identifier, RouteDirection.Next);
  },

  previous(route: AvailableRoute, identifier: string): Optional<FunnelStep> {
    return RouteNavigation.adjacent(route, identifier, RouteDirection.Previous);
  },
} as const;
