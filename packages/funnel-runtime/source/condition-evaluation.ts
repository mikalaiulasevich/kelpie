import {
  ConditionOperator,
  readOwnProperty,
  type AnswerCondition,
  type Condition,
  type SessionAnswers,
} from '@kelpie/contracts';
import { match } from 'ts-pattern';

function evaluateAnswerCondition(condition: AnswerCondition, answers: SessionAnswers): boolean {
  const answer = readOwnProperty(answers, condition.answer);

  if (answer === undefined) {
    return false;
  }

  return match(condition)
    .with({ operator: ConditionOperator.Equal }, ({ value }) => answer === value)
    .with({ operator: ConditionOperator.In }, ({ value }) => value.some((item) => item === answer))
    .with(
      { operator: ConditionOperator.Contains },
      ({ value }) => Array.isArray(answer) && answer.includes(value),
    )
    .with(
      { operator: ConditionOperator.GreaterThanOrEqual },
      ({ value }) => typeof answer === 'number' && Number.isFinite(answer) && answer >= value,
    )
    .exhaustive();
}

/** Missing or inactive answers never satisfy a predicate. */
export function evaluateCondition(condition: Condition, answers: SessionAnswers): boolean {
  if ('all' in condition) {
    return condition.all.every((child) => evaluateCondition(child, answers));
  }

  if ('any' in condition) {
    return condition.any.some((child) => evaluateCondition(child, answers));
  }

  return evaluateAnswerCondition(condition, answers);
}
