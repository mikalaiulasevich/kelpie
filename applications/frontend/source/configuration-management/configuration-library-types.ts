import { Type, type Static } from 'typebox';

export const ConfigurationLibrarySchemas = {
  Selection: Type.Object({
    search: Type.String(),
    status: Type.String(),
    descending: Type.Boolean(),
  }),
} as const;

export type ConfigurationLibrarySelection = Readonly<
  Static<typeof ConfigurationLibrarySchemas.Selection>
>;
