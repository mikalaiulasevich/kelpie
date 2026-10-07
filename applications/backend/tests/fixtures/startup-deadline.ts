import { timeout } from 'es-toolkit/promise';

export const StartupDeadline = {
  async wait<Result>(
    operation: Promise<Result>,
    milliseconds: number,
    expire: () => never,
  ): Promise<Result> {
    const cancellation = new AbortController();
    const deadline = timeout(milliseconds, { signal: cancellation.signal }).catch(expire);

    try {
      return await Promise.race([operation, deadline]);
    } finally {
      cancellation.abort();
    }
  },
} as const;
