export const StartupProcessPolicy = {
  Host: '127.0.0.1',
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
