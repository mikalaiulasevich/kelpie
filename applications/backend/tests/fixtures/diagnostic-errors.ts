export const DiagnosticFixtures = {
  multilineError(message: string): Error {
    return new Error(message);
  },

  error(stack: string, code?: string): Error {
    return Object.assign(new Error('private answer and password'), { stack, code });
  },
} as const;
