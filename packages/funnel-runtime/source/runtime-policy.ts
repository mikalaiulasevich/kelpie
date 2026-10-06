/** Decimal inputs can accumulate rounding error when divided into increments. */
export const RuntimePolicy = {
  NumericIncrementTolerance: 1e-8,
} as const;

export const RouteDirection = { Previous: -1, Next: 1 } as const;
export type RouteDirection = ValueOf<typeof RouteDirection>;
