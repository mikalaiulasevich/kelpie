import { Ajv, type ValidateFunction } from 'ajv';
import { isAbsolute, resolve } from 'node:path';
import type { Static } from 'typebox';
import { applicationDirectory } from '../application-directory.js';
import { SQLitePolicy } from '../database/sqlite-policy.js';
import { EnvironmentMessages } from './environment-messages.js';
import { EnvironmentPolicy } from './environment-policy.js';
import { EnvironmentSchemas } from './environment-schemas.js';

export { ApplicationMode } from './environment-policy.js';

export interface ApplicationEnvironment {
  readonly mode: Static<typeof EnvironmentSchemas.Mode>;
  readonly host: string;
  readonly port: number;
  readonly databaseUrl: string;
}

const schemaCompiler = new Ajv({ strict: true, coerceTypes: false });
const environmentValidators = {
  mode: schemaCompiler.compile<Static<typeof EnvironmentSchemas.Mode>>(EnvironmentSchemas.Mode),
  portText: schemaCompiler.compile<string>(EnvironmentSchemas.PortText),
  port: schemaCompiler.compile<number>(EnvironmentSchemas.Port),
  host: schemaCompiler.compile<string>(EnvironmentSchemas.Host),
  databaseUrl: schemaCompiler.compile<string>(EnvironmentSchemas.DatabaseUrl),
} as const;

function validate<Value>(
  validator: ValidateFunction<Value>,
  value: unknown,
  message: string,
): Value {
  if (!validator(value)) {
    throw new Error(message);
  }

  return value;
}

function resolveDatabaseUrl(databaseUrl: string): string {
  const databasePath = databaseUrl.slice(SQLitePolicy.FileUrlPrefix.length);
  const absolutePath = isAbsolute(databasePath)
    ? databasePath
    : resolve(applicationDirectory, databasePath);

  return `${SQLitePolicy.FileUrlPrefix}${absolutePath}`;
}

export function readApplicationEnvironment(
  values: ReadonlyDictionary<string, Optional<string>>,
): ApplicationEnvironment {
  const mode = validate(
    environmentValidators.mode,
    values['NODE_ENV'] ?? EnvironmentPolicy.DefaultMode,
    EnvironmentMessages.InvalidMode,
  );
  const portText = validate(
    environmentValidators.portText,
    values['PORT'] ?? EnvironmentPolicy.DefaultPort,
    EnvironmentMessages.InvalidPort,
  );
  const port = validate(
    environmentValidators.port,
    Number(portText),
    EnvironmentMessages.InvalidPort,
  );
  const host = validate(
    environmentValidators.host,
    values['HOST'] ?? EnvironmentPolicy.DefaultHost,
    EnvironmentMessages.InvalidHost,
  );
  const databaseUrl = validate(
    environmentValidators.databaseUrl,
    values['DATABASE_URL'] ?? EnvironmentPolicy.DefaultDatabaseUrl,
    EnvironmentMessages.InvalidDatabaseUrl,
  );

  return { mode, host, port, databaseUrl: resolveDatabaseUrl(databaseUrl) };
}
