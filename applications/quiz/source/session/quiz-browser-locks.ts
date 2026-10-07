export const QuizBrowserLocks = {
  async run<Result>(name: string, operation: () => Awaitable<Result>): Promise<Result> {
    // The browser global can be absent during server rendering and Node verification.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(name, operation);
    }

    return operation();
  },
};
