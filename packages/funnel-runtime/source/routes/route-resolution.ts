import type {
  ExperimentVariant,
  FunnelConfiguration,
  FunnelStep,
  SessionAnswers,
} from '@kelpie/contracts';
import { RouteBuilder } from './route-builder.js';
import { RouteDirection, type AvailableRoute } from './route-types.js';

const RouteNavigation = {
  adjacent(
    route: AvailableRoute,
    stepIdentifier: string,
    direction: RouteDirection,
  ): Optional<FunnelStep> {
    const position = route.steps.findIndex((step) => step.id === stepIdentifier);

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
    return RouteBuilder.resolve(configuration, variant, answers).route;
  },

  next(route: AvailableRoute, stepIdentifier: string): Optional<FunnelStep> {
    return RouteNavigation.adjacent(route, stepIdentifier, RouteDirection.Next);
  },

  previous(route: AvailableRoute, stepIdentifier: string): Optional<FunnelStep> {
    return RouteNavigation.adjacent(route, stepIdentifier, RouteDirection.Previous);
  },
} as const;
