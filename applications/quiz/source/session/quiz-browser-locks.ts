export const QuizBrowserLocks = {
  async run<Result>(name: string, operation: () => Awaitable<Result>): Promise<Result> {
    // The browser global can be absent during server rendering and Node verification.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      // Normalize synchronous throws into a rejected promise so native lock implementations
      // release the held lock on both synchronous storage failures and asynchronous failures.
      return navigator.locks.request(name, async () => operation());
    }

    return operation();
  },
};
