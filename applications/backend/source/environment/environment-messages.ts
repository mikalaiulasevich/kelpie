export const EnvironmentMessages = {
  InvalidAdministrationOrigin:
    'ADMINISTRATION_ORIGIN must be an exact HTTP origin; production requires an explicit HTTPS origin.',
  InvalidQuizOrigin: 'QUIZ_ORIGIN must be an exact HTTP origin; production requires HTTPS.',
  InvalidLogLevel: 'LOG_LEVEL must be trace, debug, info, warn, error, or fatal.',
  InvalidMode: 'NODE_ENV must be development, test, or production.',
  InvalidPort: 'PORT must be an integer from 1 to 65535.',
  InvalidHost: 'HOST must be a hostname or IP address.',
  InvalidDatabaseUrl:
    'DATABASE_URL must identify a local SQLite file or a secure libsql host without credentials or query parameters.',
  InvalidDatabaseAuthToken:
    'DATABASE_AUTH_TOKEN is required for remote libSQL and must be a valid token.',
  UnexpectedDatabaseAuthToken:
    'DATABASE_AUTH_TOKEN is only supported with a remote libSQL database.',
  InvalidTrustProxyLoopback: 'TRUST_PROXY_LOOPBACK must be true or false.',
} as const;
