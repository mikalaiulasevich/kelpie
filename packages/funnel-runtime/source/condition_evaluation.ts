import { ConditionOperator, type Condition, type SessionAnswers } from '@kelpie/contracts';

/** Missing or inactive answers never satisfy a predicate. */
export function evaluateCondition(condition: Condition, answers: SessionAnswers): boolean {
  if ('all' in condition) {
    return condition.all.every((child) => evaluateCondition(child, answers));
  }

  if ('any' in condition) {
    return condition.any.some((child) => evaluateCondition(child, answers));
  }

  const answer = Object.hasOwn(answers, condition.answer) ? answers[condition.answer] : undefined;

  if (answer === undefined) {
    return false;
  }

  switch (condition.operator) {
    case ConditionOperator.Equal:
      return answer === condition.value;
    case ConditionOperator.In:
      return condition.value.some((value) => value === answer);
    case ConditionOperator.Contains:
      return Array.isArray(answer) && answer.includes(condition.value);
    case ConditionOperator.GreaterThanOrEqual:
      return typeof answer === 'number' && Number.isFinite(answer) && answer >= condition.value;
  }
}
