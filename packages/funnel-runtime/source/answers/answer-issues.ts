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
