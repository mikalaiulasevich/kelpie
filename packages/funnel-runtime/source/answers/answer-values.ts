import { isNil } from 'es-toolkit/predicate';
import { isMatching, P } from 'ts-pattern';

export const AnswerValues = {
  isFiniteNumber: isMatching(P.number.finite()),
  isMissing(answer: unknown): answer is null | undefined | '' {
    return isNil(answer) || answer === '';
  },

  isBoundedSelection(answer: unknown, maximumLength: number): answer is ReadonlyList<string> {
    if (!Array.isArray(answer) || answer.length > maximumLength) {
      return false;
    }

    // Array iteration exposes sparse slots as undefined; every() would skip them.
    for (const value of answer) {
      if (typeof value !== 'string') {
        return false;
      }
    }

    return true;
  },
} as const;
