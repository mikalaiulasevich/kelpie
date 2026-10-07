import { BadRequestException } from '@nestjs/common';
import { Type, type Static } from 'typebox';
import { Prisma } from '../../generated/prisma/client.js';
import { ManagementSchemas } from '../management/management-types.js';
import { ManagementQueries } from '../management/management-queries.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { ConfigurationManagementMessages } from './configuration-management-messages.js';

export const ConfigurationLibrarySort = {
  VersionDescending: 'version-desc',
  VersionAscending: 'version-asc',
  ImportedDescending: 'imported-desc',
  ImportedAscending: 'imported-asc',
} as const;

const querySchema = Type.Object(
  {
    ...ManagementSchemas.Query.properties,
    search: Type.Optional(Type.String({ maxLength: 200 })),
    status: Type.Optional(Type.Enum({ All: 'all', Live: 'live', Inactive: 'inactive' })),
    sort: Type.Optional(Type.Enum(ConfigurationLibrarySort)),
  },
  { additionalProperties: false },
);

const selectionSchema = Type.Object({
  ...ManagementSchemas.ResolvedQuery.properties,
  search: Type.String(),
  status: Type.Enum({ All: 'all', Live: 'live', Inactive: 'inactive' }),
  sort: Type.Enum(ConfigurationLibrarySort),
});

type ConfigurationLibrarySelection = Static<typeof selectionSchema>;

type ConfigurationLibraryInput = Static<typeof querySchema>;

const validate = SchemaCompiler.compile<ConfigurationLibraryInput>(querySchema);

export const ConfigurationLibraryQuery = {
  read(value: unknown): ConfigurationLibrarySelection {
    if (!validate(value)) {
      throw new BadRequestException(ConfigurationManagementMessages.InvalidQuery);
    }

    const pagination = ManagementQueries.read({
      funnelIdentifier: value.funnelIdentifier,
      ...(value.limit ? { limit: value.limit } : {}),
      ...(value.offset ? { offset: value.offset } : {}),
    });

    return {
      ...pagination,
      search: value.search?.trim() ?? '',
      status: value.status ?? 'all',
      sort: value.sort ?? ConfigurationLibrarySort.VersionDescending,
    };
  },

  condition(query: ConfigurationLibrarySelection, activeIdentifier: string | null): Prisma.Sql {
    const predicates = [Prisma.sql`"funnelIdentifier" = ${query.funnelIdentifier}`];

    if (query.status === 'live') {
      predicates.push(Prisma.sql`"identifier" = ${activeIdentifier}`);
    }

    if (query.status === 'inactive' && activeIdentifier) {
      predicates.push(Prisma.sql`"identifier" <> ${activeIdentifier}`);
    }

    if (query.search) {
      const search = `%${query.search.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
      predicates.push(
        Prisma.sql`(CAST("version" AS TEXT) LIKE ${search} ESCAPE '\\' OR "schemaVersion" LIKE ${search} ESCAPE '\\' OR "checksum" LIKE ${search} ESCAPE '\\' OR "identifier" LIKE ${search} ESCAPE '\\' OR COALESCE("importedByUsername", '') LIKE ${search} ESCAPE '\\' OR COALESCE(json_extract("document", '$.description'), '') LIKE ${search} ESCAPE '\\')`,
      );
    }

    return Prisma.join(predicates, ' AND ');
  },

  order(sort: ValueOf<typeof ConfigurationLibrarySort>): Prisma.Sql {
    switch (sort) {
      case ConfigurationLibrarySort.VersionAscending:
        return Prisma.sql`"version" ASC`;
      case ConfigurationLibrarySort.ImportedAscending:
        return Prisma.sql`"createdAt" ASC, "version" ASC`;
      case ConfigurationLibrarySort.ImportedDescending:
        return Prisma.sql`"createdAt" DESC, "version" DESC`;
      default:
        return Prisma.sql`"version" DESC`;
    }
  },
};
