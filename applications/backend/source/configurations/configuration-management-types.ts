import { Type, type Static } from 'typebox';
import type { FunnelConfiguration } from '@kelpie/contracts';
import { ManagementSchemas } from '../management/management-types.js';
import { ConfigurationImportSchemas } from './configuration-import-types.js';

export const ConfigurationListSchema = Type.Object({
  funnel: ManagementSchemas.FunnelReference,
  items: Type.Array(ConfigurationImportSchemas.VersionMetadata),
  nextOffset: Type.Union([Type.Integer(), Type.Null()]),
});

export type ConfigurationList = DeepReadonly<Static<typeof ConfigurationListSchema>>;

export const ConfigurationVersionDocumentSchema = Type.Object({
  version: ConfigurationImportSchemas.VersionMetadata,
  document: Type.Unknown(),
});

export type ConfigurationVersionDocument = DeepReadonly<
  Omit<Static<typeof ConfigurationVersionDocumentSchema>, 'document'>
> & { readonly document: FunnelConfiguration };
