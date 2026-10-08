import { SQLitePolicy } from './sqlite-policy.js';

export const RemoteDatabaseRequests = {
  fetch(request: Request): Promise<Response> {
    // Keep the deadline attached to the response body as well as the initial headers.
    // Combining signals preserves cancellation owned by the libSQL transaction/client.
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(SQLitePolicy.RemoteRequestTimeoutMilliseconds),
    ]);

    return globalThis.fetch(request, { signal });
  },
} as const;
