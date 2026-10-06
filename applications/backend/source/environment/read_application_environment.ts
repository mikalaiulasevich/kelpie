import { isAbsolute, resolve } from 'node:path';
import { applicationDirectory } from '../application_directory.js';

export const ApplicationMode = Object.freeze({
  Development: 'development',
  Test: 'test',
  Production: 'production',
} as const);

export type ApplicationMode = (typeof ApplicationMode)[keyof typeof ApplicationMode];

export interface ApplicationEnvironment {
  readonly mode: ApplicationMode;
  readonly host: string;
  readonly port: number;
  readonly databaseUrl: string;
}

export function readApplicationEnvironment(
  values: Readonly<Record<string, string | undefined>>,
): ApplicationEnvironment {
  const mode = values['NODE_ENV'] ?? ApplicationMode.Development;

  if (
    mode !== ApplicationMode.Development &&
    mode !== ApplicationMode.Test &&
    mode !== ApplicationMode.Production
  ) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  const portValue = values['PORT'] ?? '3000';

  if (!/^\d{1,5}$/.test(portValue)) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }

  const port = Number(portValue);

  if (port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }

  const host = values['HOST'] ?? '127.0.0.1';

  if (!/^[a-zA-Z0-9.:-]{1,253}$/.test(host)) {
    throw new Error('HOST must be a hostname or IP address.');
  }

  const databaseUrl = values['DATABASE_URL'] ?? 'file:./data/funnel-runtime.sqlite';

  if (
    !databaseUrl.startsWith('file:') ||
    databaseUrl.length <= 5 ||
    /[?#]/.test(databaseUrl) ||
    databaseUrl.includes('\0')
  ) {
    throw new Error('DATABASE_URL must identify a local SQLite file without query parameters.');
  }

  const databasePath = databaseUrl.slice(5);

  return {
    mode,
    host,
    port,
    databaseUrl: `file:${isAbsolute(databasePath) ? databasePath : resolve(applicationDirectory, databasePath)}`,
  };
}
