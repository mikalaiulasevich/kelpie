import { readOwnProperty, type AnswerValidation } from '@kelpie/contracts';
import type { AnswerIssue, AnswerIssueCode, AnswerValidationResult } from './runtime-types.js';

export const AnswerIssues = {
  create(
    validation: AnswerValidation,
    code: AnswerIssueCode,
    fallbackMessage: string,
  ): AnswerIssue {
    const customMessage = readOwnProperty(validation.messages, code);

    return { code, message: customMessage ?? fallbackMessage };
  },

  result(issues: ReadonlyList<AnswerIssue>): AnswerValidationResult {
    if (issues.length === 0) {
      return { valid: true, issues: [] };
    }

    return { valid: false, issues };
  },
} as const;
