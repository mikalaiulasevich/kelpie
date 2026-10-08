import { RemoteMigrationPolicy } from './remote-migration-policy.js';
import { SQLitePolicy } from './sqlite-policy.js';

const RequestDeadlines = {
  fetch(request: Request, timeoutMilliseconds: number): Promise<Response> {
    // Keep the deadline attached to the response body as well as the initial headers.
    // Combining signals preserves cancellation owned by the libSQL transaction/client.
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMilliseconds)]);

    return globalThis.fetch(request, { signal });
  },
} as const;

export const RemoteDatabaseRequests = {
  fetch(request: Request): Promise<Response> {
    return RequestDeadlines.fetch(request, SQLitePolicy.RemoteRequestTimeoutMilliseconds);
  },

  fetchMigration(request: Request): Promise<Response> {
    return RequestDeadlines.fetch(request, RemoteMigrationPolicy.RequestTimeoutMilliseconds);
  },
} as const;
