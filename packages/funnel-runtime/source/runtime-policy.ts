/** Decimal inputs can accumulate rounding error when divided into increments. */
export const RuntimePolicy = Object.freeze({
  NumericIncrementTolerance: 1e-8,
});
