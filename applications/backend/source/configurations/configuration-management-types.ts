import { Type, type Static } from 'typebox';
import { FunnelReferenceSchema } from '../publications/publication-types.js';
import { ConfigurationImportResultSchema } from './configuration-import-types.js';

export const ConfigurationListSchema = Type.Object({
  funnel: FunnelReferenceSchema,
  items: Type.Array(ConfigurationImportResultSchema.properties.version),
  nextOffset: Type.Union([Type.Integer(), Type.Null()]),
});

export type ConfigurationList = DeepReadonly<Static<typeof ConfigurationListSchema>>;
