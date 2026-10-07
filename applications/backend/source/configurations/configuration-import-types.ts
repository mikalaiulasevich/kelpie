import { Type, type Static } from 'typebox';
import type { FunnelConfiguration } from '@kelpie/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

export const ConfigurationImportOutcome = { Created: 'created', Existing: 'existing' } as const;
export type ConfigurationImportOutcome = ValueOf<typeof ConfigurationImportOutcome>;

export const ConfigurationImportErrorCode = { Invalid: 'invalid', Conflict: 'conflict' } as const;
export type ConfigurationImportErrorCode = ValueOf<typeof ConfigurationImportErrorCode>;

const configurationVersionMetadataSchema = Type.Object({
  identifier: Type.String(),
  funnelIdentifier: Type.String(),
  version: Type.Integer(),
  schemaVersion: Type.String(),
  checksum: Type.String(),
});

export const ConfigurationImportResultSchema = Type.Object({
  outcome: Type.Enum(ConfigurationImportOutcome),
  version: configurationVersionMetadataSchema,
});

export type ConfigurationVersionMetadata = Readonly<
  Static<typeof configurationVersionMetadataSchema>
>;
export type ConfigurationImportResult = DeepReadonly<
  Static<typeof ConfigurationImportResultSchema>
>;

export interface PreparedConfigurationImport {
  readonly configuration: FunnelConfiguration;
  readonly document: Prisma.InputJsonObject;
  readonly checksum: string;
}
