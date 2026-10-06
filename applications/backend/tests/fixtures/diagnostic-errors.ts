export const DiagnosticFixtures = {
  error(stack: string, code?: string): Error {
    return Object.assign(new Error('private answer and password'), { stack, code });
  },
} as const;
