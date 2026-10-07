export const FrameworkLoggingCases = {
  Levels: [
    { method: 'log', severity: 'info' },
    { method: 'error', severity: 'error' },
    { method: 'warn', severity: 'warn' },
    { method: 'debug', severity: 'debug' },
    { method: 'verbose', severity: 'trace' },
    { method: 'fatal', severity: 'fatal' },
  ],
  UntrustedMessages: [
    { name: 'text', message: 'password=private-password' },
    { name: 'object', message: { password: 'private-password' } },
    { name: 'number', message: 123456789 },
    { name: 'missing', message: undefined },
  ],
} as const;
