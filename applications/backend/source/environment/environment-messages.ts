export const EnvironmentMessages = {
  InvalidLogLevel: 'LOG_LEVEL must be trace, debug, info, warn, error, or fatal.',
  InvalidMode: 'NODE_ENV must be development, test, or production.',
  InvalidPort: 'PORT must be an integer from 1 to 65535.',
  InvalidHost: 'HOST must be a hostname or IP address.',
  InvalidDatabaseUrl: 'DATABASE_URL must identify a local SQLite file without query parameters.',
} as const;
