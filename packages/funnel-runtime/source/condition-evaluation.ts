import type { Condition, SessionAnswers } from '@kelpie/contracts';

/** Missing or inactive answers never satisfy a predicate. */
export function evaluateCondition(condition: Condition, answers: SessionAnswers): boolean {
  if ('all' in condition) return condition.all.every((child) => evaluateCondition(child, answers));
  if ('any' in condition) return condition.any.some((child) => evaluateCondition(child, answers));
  const answer = Object.hasOwn(answers, condition.answer) ? answers[condition.answer] : undefined;
  if (answer === undefined) return false;
  switch (condition.operator) {
    case 'eq':
      return answer === condition.value;
    case 'in':
      return condition.value.some((value) => value === answer);
    case 'contains':
      return Array.isArray(answer) && answer.includes(condition.value);
    case 'gte':
      return typeof answer === 'number' && Number.isFinite(answer) && answer >= condition.value;
  }
}
