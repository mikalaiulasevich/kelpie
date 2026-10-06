import { Type } from 'typebox';
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
