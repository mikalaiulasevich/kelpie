import { HealthRoutes } from '../../source/health/health-policy.js';
import { TransportPolicy } from '../../source/transport/transport-policy.js';

export const StartupProcessPolicy = {
  Host: '127.0.0.1',
  HttpScheme: 'http:',
  LivenessPath: `/${TransportPolicy.ApiPrefix}/${HealthRoutes.Controller}/${HealthRoutes.Liveness}`,
  EntryArguments: ['--import', 'tsx', 'source/main.ts'],
  StandardStreams: ['ignore', 'pipe', 'pipe'],
  TerminationSignal: 'SIGTERM',
  ForcedTerminationSignal: 'SIGKILL',
  TimeoutMilliseconds: 8_000,
  SlowRequestExitMilliseconds: 15_000,
  SlowRequestTestMilliseconds: 25_000,
  SocketCloseMilliseconds: 1_000,
  PollMilliseconds: 50,
  RequestTimeoutMilliseconds: 500,
  MaximumOutputCharacters: 65_536,
  DirectoryPrefix: 'kelpie-startup-',
  DatabaseFilename: 'private-database-marker.sqlite',
} as const;
