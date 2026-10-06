/** Decimal inputs can accumulate rounding error when divided into increments. */
export const RuntimePolicy = Object.freeze({
  NumericIncrementTolerance: 1e-8,
});

export const RouteDirection = Object.freeze({ Previous: -1, Next: 1 } as const);
export type RouteDirection = ValueOf<typeof RouteDirection>;
