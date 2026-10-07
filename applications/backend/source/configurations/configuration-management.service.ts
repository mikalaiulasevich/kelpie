import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { isNull } from 'es-toolkit/predicate';
import { omit } from 'es-toolkit/object';
import { DatabaseService } from '../database/database.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ConfigurationLibraryQuery } from './configuration-library-query.js';
import { ManagementRecords } from '../management/management-records.js';
import { PublicRequestError } from '../transport/public-request-error.js';
import { ConfigurationImportError } from './configuration-import-error.js';
import { ConfigurationImportService } from './configuration-import.service.js';
import type {
  ConfigurationList,
  ConfigurationVersionDocument,
} from './configuration-management-types.js';
import { ConfigurationManagementInputs } from './configuration-management-inputs.js';
import { ConfigurationManagementMessages } from './configuration-management-messages.js';
import { ConfigurationImportDocument } from './configuration-import-document.js';
import type { ConfigurationImportResult } from './configuration-import-types.js';
import {
  ConfigurationImportHttpStatus,
  ConfigurationImportPolicy,
} from './configuration-import-policy.js';

@Injectable()
export class ConfigurationManagementService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ConfigurationImportService) private readonly imports: ConfigurationImportService,
  ) {}

  async import(document: unknown, importedBy?: string): Promise<ConfigurationImportResult> {
    try {
      return await this.imports.import(document, importedBy);
    } catch (error) {
      if (!(error instanceof ConfigurationImportError)) {
        throw error;
      }

      throw new PublicRequestError(
        ConfigurationImportHttpStatus[error.code],
        error.code,
        error.message,
        error.issues,
      );
    }
  }

  async list(query: unknown): Promise<ConfigurationList> {
    const pagination = ConfigurationLibraryQuery.read(query);
    const { funnelIdentifier, limit, offset } = pagination;

    return this.database.client.$transaction(async (transaction) => {
      const funnel = await ManagementRecords.readFunnel(transaction, funnelIdentifier);

      const condition = ConfigurationLibraryQuery.condition(
        pagination,
        funnel.activeVersionIdentifier,
      );
      const identifiers = await transaction.$queryRaw<{ identifier: string }[]>(
        Prisma.sql`SELECT "identifier" FROM "FunnelVersion" WHERE ${condition} ORDER BY ${ConfigurationLibraryQuery.order(pagination.sort)} LIMIT ${limit + 1} OFFSET ${offset}`,
      );
      const counts = await transaction.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS total FROM "FunnelVersion" WHERE ${condition}`,
      );
      const records = await transaction.funnelVersion.findMany({
        where: { identifier: { in: identifiers.map(({ identifier }) => identifier) } },
      });
      const recordsByIdentifier = new Map(records.map((record) => [record.identifier, record]));
      const versions = identifiers.map(({ identifier }) => {
        const record = recordsByIdentifier.get(identifier);

        if (!record) {
          throw new Error(ConfigurationManagementMessages.CorruptedVersion);
        }

        const prepared = ConfigurationImportDocument.prepare(record.document);

        if (!ConfigurationImportDocument.matchesVersion(record, prepared)) {
          throw new Error(ConfigurationManagementMessages.CorruptedVersion);
        }

        return {
          identifier: record.identifier,
          funnelIdentifier: record.funnelIdentifier,
          version: record.version,
          schemaVersion: record.schemaVersion,
          checksum: record.checksum,
          importedAt: record.createdAt.toISOString(),
          importedBy: record.importedByUsername,
          description: prepared.configuration.description,
          documentStatus: prepared.configuration.status,
        };
      });

      return {
        funnel,
        total: Number(counts[0]?.total ?? 0),
        ...ManagementRecords.page(versions, pagination),
      };
    });
  }

  async document(value: unknown): Promise<ConfigurationVersionDocument> {
    const identifier = ConfigurationManagementInputs.identifier(value);
    const record = await this.database.client.funnelVersion.findUnique({
      where: { identifier },
      select: { ...ConfigurationImportPolicy.VersionSelection, document: true },
    });

    if (isNull(record)) {
      throw new NotFoundException(ConfigurationManagementMessages.MissingVersion);
    }

    try {
      const prepared = ConfigurationImportDocument.prepare(record.document);

      if (!ConfigurationImportDocument.matchesVersion(record, prepared)) {
        throw new Error(ConfigurationManagementMessages.CorruptedVersion);
      }

      const version = omit(record, ['document']);

      return { version, document: prepared.configuration };
    } catch (error) {
      if (error instanceof ConfigurationImportError) {
        throw new Error(ConfigurationManagementMessages.CorruptedVersion, { cause: error });
      }

      throw error;
    }
  }
}
