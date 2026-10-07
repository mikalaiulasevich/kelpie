import { DiagnosticSeverity } from '../diagnostics/diagnostic-policy.js';
import { Type, type Static } from 'typebox';
import { ApplicationMode, EnvironmentPolicy } from './environment-policy.js';

export const EnvironmentSchemas = {
  Mode: Type.Enum(ApplicationMode),
  LogLevel: Type.Enum(DiagnosticSeverity),
  PortText: Type.String({ pattern: EnvironmentPolicy.PortPattern }),
  Port: Type.Integer({
    minimum: EnvironmentPolicy.MinimumPort,
    maximum: EnvironmentPolicy.MaximumPort,
  }),
  Host: Type.String({ pattern: EnvironmentPolicy.HostPattern }),
  DatabaseUrl: Type.String({ pattern: EnvironmentPolicy.DatabaseUrlPattern }),
} as const;

export const ApplicationEnvironmentSchema = Type.Object({
  mode: EnvironmentSchemas.Mode,
  administrationOrigin: Type.String(),
  logLevel: EnvironmentSchemas.LogLevel,
  host: EnvironmentSchemas.Host,
  port: EnvironmentSchemas.Port,
  databaseUrl: EnvironmentSchemas.DatabaseUrl,
});

export type ApplicationEnvironment = Readonly<Static<typeof ApplicationEnvironmentSchema>>;
