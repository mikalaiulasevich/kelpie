import { DictionaryAccess, type AnswerValidation } from '@kelpie/contracts';
import type { AnswerIssue, AnswerIssueCode, AnswerValidationResult } from './answer-types.js';

export const AnswerIssues = {
  create(
    validation: AnswerValidation,
    code: AnswerIssueCode,
    fallbackMessage: string,
  ): AnswerIssue {
    const customMessage = DictionaryAccess.readOwn(validation.messages, code);

    return { code, message: customMessage ?? fallbackMessage };
  },

  result(issues: ReadonlyList<AnswerIssue>): AnswerValidationResult {
    if (issues.length === 0) {
      return { valid: true, issues: [] };
    }

    return { valid: false, issues };
  },
} as const;

export class AnswerIssueCollection {
  private readonly issues: AnswerIssue[] = [];

  constructor(private readonly validation: AnswerValidation) {}

  addWhen(condition: boolean, code: AnswerIssueCode, fallbackMessage: string): this {
    if (condition) {
      this.issues.push(AnswerIssues.create(this.validation, code, fallbackMessage));
    }

    return this;
  }

  addFormattedWhen<Value>(
    condition: boolean,
    code: AnswerIssueCode,
    format: ValueMapper<Value, string>,
    value: Value,
  ): this {
    if (condition) {
      this.addWhen(condition, code, format(value));
    }

    return this;
  }

  toIssues(): ReadonlyList<AnswerIssue> {
    return this.issues;
  }
}
