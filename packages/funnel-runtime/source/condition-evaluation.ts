import {
  ConditionOperator,
  DictionaryAccess,
  type AnswerCondition,
  type Condition,
  type SessionAnswers,
} from '@kelpie/contracts';
import { match, P } from 'ts-pattern';
import { AnswerValues } from './answer-values.js';

const AnswerConditions = {
  evaluate(condition: AnswerCondition, answers: SessionAnswers): boolean {
    const answer = DictionaryAccess.readOwn(answers, condition.answer);

    if (answer === undefined) {
      return false;
    }

    return match(condition)
      .with({ operator: ConditionOperator.Equal }, ({ value }) => answer === value)
      .with({ operator: ConditionOperator.In }, ({ value }) =>
        value.some((item) => item === answer),
      )
      .with(
        { operator: ConditionOperator.Contains },
        ({ value }) => Array.isArray(answer) && answer.includes(value),
      )
      .with(
        { operator: ConditionOperator.GreaterThanOrEqual },
        ({ value }) => AnswerValues.isFiniteNumber(answer) && answer >= value,
      )
      .exhaustive();
  },
} as const;

/** Missing or inactive answers never satisfy a predicate. */
export const ConditionEvaluation = {
  evaluate(condition: Condition, answers: SessionAnswers): boolean {
    return match(condition)
      .with({ all: P._ }, ({ all }) =>
        all.every((child) => ConditionEvaluation.evaluate(child, answers)),
      )
      .with({ any: P._ }, ({ any }) =>
        any.some((child) => ConditionEvaluation.evaluate(child, answers)),
      )
      .with({ answer: P.string }, (predicate) => AnswerConditions.evaluate(predicate, answers))
      .exhaustive();
  },
} as const;
