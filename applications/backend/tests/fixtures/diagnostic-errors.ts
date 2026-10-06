export const DiagnosticFixtures = {
  multilineError(message: string): Error {
    return new Error(message);
  },

  cachedError(message: string, property: 'name' | 'message'): Error {
    const error = new Error(message);
    void error.stack;
    error[property] = 'redacted';

    return error;
  },

  error(stack: string, code?: string): Error {
    const header = stack.split('\n    at ', 1)[0] ?? '';
    const message = header.slice('Error: '.length);

    return Object.assign(new Error(message), { stack, code });
  },
} as const;
