import { stdTimeFunctions, type LoggerOptions } from 'pino';
import { DiagnosticSeverity } from './diagnostic-policy.js';

const LoggingFormatters = {
  level(label: string): Readonly<{ level: string }> {
    return { level: label };
  },
} as const;

export const LoggingPolicy = {
  DefaultLevel: DiagnosticSeverity.Information,
  Options: {
    base: null,
    timestamp: stdTimeFunctions.isoTime,
    formatters: LoggingFormatters,
    redact: {
      remove: true,
      paths: [
        'password',
        'passwordHash',
        'token',
        'accessToken',
        'accessTokenHash',
        'sessionToken',
        'authorization',
        'cookie',
        'cookies',
        'headers',
        'body',
        'answer',
        'answers',
        'request',
        'response',
        'err',
        'cause',
        'error.message',
        'error.stack',
        'error.cause',
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.accessToken',
        '*.accessTokenHash',
        '*.sessionToken',
        '*.authorization',
        '*.cookie',
        '*.cookies',
        '*.headers',
        '*.body',
        '*.answer',
        '*.answers',
      ],
    },
  } satisfies LoggerOptions,
} as const;
