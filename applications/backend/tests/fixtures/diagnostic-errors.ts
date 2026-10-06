import { ErrorDiagnostics } from '../../source/diagnostics/error-diagnostics.js';
import type { ErrorDescription } from '../../source/diagnostics/diagnostics-types.js';

export const DiagnosticFixtures = {
  multilineError(message: string): Error {
    return new Error(message);
  },

  cachedError(message: string, property: 'name' | 'message', replacement: string): Error {
    const error = new Error(message);
    void error.stack;
    error[property] = replacement;

    return error;
  },

  describeAtDepth(depth: number, error: Error): ErrorDescription {
    if (depth > 0) {
      return DiagnosticFixtures.describeAtDepth(depth - 1, error);
    }

    return ErrorDiagnostics.describe(error);
  },

  error(stack: string, code?: string): Error {
    return Object.assign(new Error('private answer and password'), { stack, code });
  },
} as const;
