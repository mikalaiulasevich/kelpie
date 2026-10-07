import { Type, type Static } from 'typebox';
import type { FunnelConfiguration } from '@kelpie/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

export const ConfigurationImportOutcome = { Created: 'created', Existing: 'existing' } as const;
export type ConfigurationImportOutcome = ValueOf<typeof ConfigurationImportOutcome>;

export const ConfigurationImportErrorCode = { Invalid: 'invalid', Conflict: 'conflict' } as const;
export type ConfigurationImportErrorCode = ValueOf<typeof ConfigurationImportErrorCode>;

const versionMetadata = Type.Object({
  identifier: Type.String(),
  funnelIdentifier: Type.String(),
  version: Type.Integer(),
  schemaVersion: Type.String(),
  checksum: Type.String(),
});

export const ConfigurationImportSchemas = {
  VersionMetadata: versionMetadata,
  Result: Type.Object({
    outcome: Type.Enum(ConfigurationImportOutcome),
    version: versionMetadata,
  }),
} as const;

export type ConfigurationVersionMetadata = Readonly<
  Static<typeof ConfigurationImportSchemas.VersionMetadata>
>;
export type ConfigurationImportResult = DeepReadonly<
  Static<typeof ConfigurationImportSchemas.Result>
>;

export interface PreparedConfigurationImport {
  readonly configuration: FunnelConfiguration;
  readonly document: Prisma.InputJsonObject;
  readonly checksum: string;
}
