import { isMatching, P } from 'ts-pattern';

export const isFiniteNumber = isMatching(P.number.finite());
export const isMissingAnswer = isMatching(P.union(P.nullish, ''));
