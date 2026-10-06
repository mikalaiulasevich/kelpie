/** Decimal inputs can accumulate rounding error when divided into increments. */
export const AnswerPolicy = {
  NumericIncrementTolerance: 1e-8,
} as const;
