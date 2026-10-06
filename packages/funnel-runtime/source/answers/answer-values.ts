import { isNil, isString } from 'es-toolkit/predicate';

export const AnswerValues = {
  isFiniteNumber(value: unknown): value is number {
    return Number.isFinite(value);
  },
  isMissing(answer: unknown): answer is Nullable<''> {
    return isNil(answer) || answer === '';
  },

  isBoundedSelection(answer: unknown, maximumLength: number): answer is ReadonlyList<string> {
    if (!Array.isArray(answer) || answer.length > maximumLength) {
      return false;
    }

    // Array iteration exposes sparse slots as undefined; every() would skip them.
    for (const value of answer) {
      if (!isString(value)) {
        return false;
      }
    }

    return true;
  },
} as const;
