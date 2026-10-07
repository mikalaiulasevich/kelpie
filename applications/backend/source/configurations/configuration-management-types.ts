import { Type, type Static } from 'typebox';
import { ManagementSchemas } from '../management/management-types.js';
import { ConfigurationImportSchemas } from './configuration-import-types.js';

export const ConfigurationListSchema = Type.Object({
  funnel: ManagementSchemas.FunnelReference,
  items: Type.Array(ConfigurationImportSchemas.VersionMetadata),
  nextOffset: Type.Union([Type.Integer(), Type.Null()]),
});

export type ConfigurationList = DeepReadonly<Static<typeof ConfigurationListSchema>>;
