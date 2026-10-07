import { attempt } from 'es-toolkit/util';
import { isNull } from 'es-toolkit/predicate';
import { Ajv, type ValidateFunction } from 'ajv';
import { isAbsolute, resolve } from 'node:path';
import type { Static } from 'typebox';
import { applicationDirectory } from '../application/application-directory.js';
import { SQLitePolicy } from '../database/sqlite-policy.js';
import { EnvironmentMessages } from './environment-messages.js';
import { ApplicationMode, EnvironmentFields, EnvironmentPolicy } from './environment-policy.js';
import { EnvironmentSchemas, type ApplicationEnvironment } from './environment-schemas.js';

const schemaCompiler = new Ajv({ strict: true, coerceTypes: false });

const environmentValidators = {
  logLevel: schemaCompiler.compile<Static<typeof EnvironmentSchemas.LogLevel>>(
    EnvironmentSchemas.LogLevel,
  ),
  mode: schemaCompiler.compile<Static<typeof EnvironmentSchemas.Mode>>(EnvironmentSchemas.Mode),
  portText: schemaCompiler.compile<string>(EnvironmentSchemas.PortText),
  port: schemaCompiler.compile<number>(EnvironmentSchemas.Port),
  host: schemaCompiler.compile<string>(EnvironmentSchemas.Host),
  databaseUrl: schemaCompiler.compile<string>(EnvironmentSchemas.DatabaseUrl),
} as const;

const EnvironmentValues = {
  validate<Value>(validator: ValidateFunction<Value>, value: unknown, message: string): Value {
    if (!validator(value)) {
      throw new Error(message);
    }

    return value;
  },

  administrationOrigin(value: Optional<string>, mode: ApplicationEnvironment['mode']): string {
    const origin = value ?? EnvironmentPolicy.DefaultAdministrationOrigin;
    const [, parsed] = attempt(() => new URL(origin));

    if (isNull(parsed) || parsed.origin !== origin) {
      throw new Error(EnvironmentMessages.InvalidAdministrationOrigin);
    }

    if (!EnvironmentPolicy.OriginProtocols.some((protocol) => protocol === parsed.protocol)) {
      throw new Error(EnvironmentMessages.InvalidAdministrationOrigin);
    }

    if (mode === ApplicationMode.Production) {
      EnvironmentValues.requireSecureOrigin(value, parsed);
    }

    return origin;
  },

  requireSecureOrigin(value: Optional<string>, parsed: URL): void {
    if (!value || parsed.protocol !== EnvironmentPolicy.SecureOriginProtocol) {
      throw new Error(EnvironmentMessages.InvalidAdministrationOrigin);
    }
  },

  resolveDatabaseUrl(databaseUrl: string): string {
    const databasePath = databaseUrl.slice(SQLitePolicy.FileUrlPrefix.length);
    const absolutePath = isAbsolute(databasePath)
      ? databasePath
      : resolve(applicationDirectory, databasePath);

    return `${SQLitePolicy.FileUrlPrefix}${absolutePath}`;
  },
} as const;

export const ApplicationEnvironmentReader = {
  read(values: ReadonlyDictionary<string, Optional<string>>): ApplicationEnvironment {
    const mode = EnvironmentValues.validate(
      environmentValidators.mode,
      values[EnvironmentFields.Mode] ?? EnvironmentPolicy.DefaultMode,
      EnvironmentMessages.InvalidMode,
    );
    const logLevel = EnvironmentValues.validate(
      environmentValidators.logLevel,
      values[EnvironmentFields.LogLevel] ?? EnvironmentPolicy.DefaultLogLevel,
      EnvironmentMessages.InvalidLogLevel,
    );
    const portText = EnvironmentValues.validate(
      environmentValidators.portText,
      values[EnvironmentFields.Port] ?? EnvironmentPolicy.DefaultPort,
      EnvironmentMessages.InvalidPort,
    );
    const port = EnvironmentValues.validate(
      environmentValidators.port,
      Number(portText),
      EnvironmentMessages.InvalidPort,
    );
    const host = EnvironmentValues.validate(
      environmentValidators.host,
      values[EnvironmentFields.Host] ?? EnvironmentPolicy.DefaultHost,
      EnvironmentMessages.InvalidHost,
    );
    const databaseUrl = EnvironmentValues.validate(
      environmentValidators.databaseUrl,
      values[EnvironmentFields.DatabaseUrl] ?? EnvironmentPolicy.DefaultDatabaseUrl,
      EnvironmentMessages.InvalidDatabaseUrl,
    );

    return {
      mode,
      administrationOrigin: EnvironmentValues.administrationOrigin(
        values[EnvironmentFields.AdministrationOrigin],
        mode,
      ),
      logLevel,
      host,
      port,
      databaseUrl: EnvironmentValues.resolveDatabaseUrl(databaseUrl),
    };
  },
} as const;
