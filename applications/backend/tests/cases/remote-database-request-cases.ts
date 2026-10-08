import { RemoteDatabaseRequests } from '../../source/database/remote-database-requests.js';

export const RemoteDatabaseRequestCases = [
  { name: 'runtime', fetch: RemoteDatabaseRequests.fetch, timeoutMilliseconds: 30_000 },
  {
    name: 'migration command',
    fetch: RemoteDatabaseRequests.fetchMigration,
    timeoutMilliseconds: 120_000,
  },
] as const;
