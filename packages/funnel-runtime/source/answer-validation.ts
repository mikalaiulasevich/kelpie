import type { FunnelStep } from '@kelpie/contracts';

export interface AnswerIssue {
  readonly code: string;
  readonly message: string;
}
export interface AnswerValidationResult {
  readonly valid: boolean;
  readonly issues: readonly AnswerIssue[];
}

export function validateStepAnswer(step: FunnelStep, answer: unknown): AnswerValidationResult {
  if (step.type === 'info' || step.type === 'result')
    return {
      valid: false,
      issues: [{ code: 'not_interactive', message: 'This step does not accept answers.' }],
    };
  const issues: AnswerIssue[] = [];
  const report = (code: string, message: string) =>
    issues.push({
      code,
      message:
        (Object.hasOwn(step.validation.messages, code)
          ? step.validation.messages[code]
          : undefined) ?? message,
    });
  if (answer === undefined || answer === null || answer === '') {
    if (step.validation.required) report('required', 'An answer is required.');
    return { valid: issues.length === 0, issues };
  }
  if (step.type === 'number') {
    if (typeof answer !== 'number' || !Number.isFinite(answer))
      report('type', 'Enter a finite number.');
    else {
      if (answer < step.input.min) report('min', `Enter at least ${step.input.min}.`);
      if (answer > step.input.max) report('max', `Enter no more than ${step.input.max}.`);
      const increments = (answer - step.input.min) / step.input.step;
      if (!Number.isFinite(increments) || Math.abs(increments - Math.round(increments)) > 1e-8)
        report('step', `Use increments of ${step.input.step}.`);
    }
  } else if (step.type === 'single-select') {
    if (typeof answer !== 'string' || !step.input.options.some((option) => option.value === answer))
      report('option', 'Select an available option.');
  } else {
    if (
      !Array.isArray(answer) ||
      answer.length > step.input.options.length ||
      answer.some((value: unknown) => typeof value !== 'string')
    )
      report('type', 'Select available options.');
    else {
      const selectedValues = new Set<unknown>(answer);
      const optionValues = new Set(step.input.options.map((option) => option.value));
      if (selectedValues.size !== answer.length) report('duplicate', 'Selections must be unique.');
      if (answer.some((value: unknown) => typeof value !== 'string' || !optionValues.has(value)))
        report('option', 'Select an available option.');
      const minimum = step.validation.minSelections ?? (step.validation.required ? 1 : 0);
      if (answer.length < minimum) report('minSelections', `Choose at least ${minimum} options.`);
      if (answer.length > (step.validation.maxSelections ?? step.input.options.length))
        report('maxSelections', 'Too many selections.');
    }
  }
  return { valid: issues.length === 0, issues };
}
