import { Type, type Static } from 'typebox';
import { ApplicationMode, EnvironmentPolicy } from './environment-policy.js';

export const EnvironmentSchemas = {
  Mode: Type.Enum(ApplicationMode),
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
  host: EnvironmentSchemas.Host,
  port: EnvironmentSchemas.Port,
  databaseUrl: EnvironmentSchemas.DatabaseUrl,
});

export type ApplicationEnvironment = Readonly<Static<typeof ApplicationEnvironmentSchema>>;
