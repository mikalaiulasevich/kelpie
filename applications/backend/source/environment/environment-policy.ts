import { DiagnosticSeverity } from '../diagnostics/diagnostic-policy.js';
import { DatabasePaths } from '../database/database-paths.js';
import { SQLitePolicy } from '../database/sqlite-policy.js';

export const EnvironmentFields = {
  Mode: 'NODE_ENV',
  AdministrationOrigin: 'ADMINISTRATION_ORIGIN',
  LogLevel: 'LOG_LEVEL',
  Port: 'PORT',
  Host: 'HOST',
  DatabaseUrl: 'DATABASE_URL',
} as const;

export const ApplicationMode = {
  Development: 'development',
  Test: 'test',
  Production: 'production',
} as const;

export type ApplicationMode = ValueOf<typeof ApplicationMode>;

export const EnvironmentPolicy = {
  DefaultAdministrationOrigin: 'http://127.0.0.1:5173',
  OriginProtocols: ['http:', 'https:'],
  SecureOriginProtocol: 'https:',
  DefaultMode: ApplicationMode.Development,
  DefaultLogLevel: DiagnosticSeverity.Information,
  DefaultPort: '3000',
  DefaultHost: '127.0.0.1',
  DefaultDatabaseUrl: `${SQLitePolicy.FileUrlPrefix}${DatabasePaths.DefaultDatabase}`,
  MinimumPort: 1,
  MaximumPort: 65_535,
  PortPattern: '^\\d{1,5}$',
  HostPattern: '^[a-zA-Z0-9.:-]{1,253}$',
  DatabaseUrlPattern: `^${SQLitePolicy.FileUrlPrefix}[^?#\\u0000]+$`,
} as const;

export const EnvironmentInjection = {
  Values: Symbol('ApplicationEnvironment'),
} as const;
