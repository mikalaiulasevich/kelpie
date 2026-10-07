import { Inject, Injectable } from '@nestjs/common';
import { isNull } from 'es-toolkit/predicate';
import { DatabaseErrors } from '../database/database-errors.js';
import { DatabaseService } from '../database/database.service.js';
import { ConfigurationImportDocument } from './configuration-import-document.js';
import { ConfigurationImportError } from './configuration-import-error.js';
import { ConfigurationImportPolicy } from './configuration-import-policy.js';
import {
  ConfigurationImportErrorCode,
  ConfigurationImportOutcome,
  type ConfigurationImportResult,
  type ConfigurationVersionMetadata,
  type PreparedConfigurationImport,
} from './configuration-import-types.js';

@Injectable()
export class ConfigurationImportService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async import(document: unknown, importedBy?: string): Promise<ConfigurationImportResult> {
    const prepared = ConfigurationImportDocument.prepare(document);
    const existing = await this.findVersion(prepared);

    if (!isNull(existing)) {
      return this.replay(existing, prepared.checksum);
    }

    try {
      const version = await this.createVersion(prepared, importedBy);

      return { outcome: ConfigurationImportOutcome.Created, version };
    } catch (error) {
      if (!DatabaseErrors.isUniqueConstraint(error)) {
        throw error;
      }

      // Read the committed winner only after the losing transaction rolls back.
      const winner = await this.findVersion(prepared);

      if (isNull(winner)) {
        throw error;
      }

      return this.replay(winner, prepared.checksum);
    }
  }

  private replay(
    version: ConfigurationVersionMetadata,
    checksum: string,
  ): ConfigurationImportResult {
    if (version.checksum !== checksum) {
      throw new ConfigurationImportError(ConfigurationImportErrorCode.Conflict);
    }

    return { outcome: ConfigurationImportOutcome.Existing, version };
  }

  private async findVersion(
    prepared: PreparedConfigurationImport,
  ): Promise<ConfigurationVersionMetadata | null> {
    return this.database.client.funnelVersion.findUnique({
      where: {
        funnelIdentifier_version: {
          funnelIdentifier: prepared.configuration.funnelId,
          version: prepared.configuration.version,
        },
      },
      select: ConfigurationImportPolicy.VersionSelection,
    });
  }

  private async createVersion(
    prepared: PreparedConfigurationImport,
    importedBy?: string,
  ): Promise<ConfigurationVersionMetadata> {
    const { configuration, document } = prepared;

    return this.database.client.$transaction(async (transaction) => {
      await transaction.funnel.upsert({
        where: { identifier: configuration.funnelId },
        create: { identifier: configuration.funnelId },
        update: {},
      });

      return transaction.funnelVersion.create({
        data: {
          ...ConfigurationImportDocument.identity(prepared),
          document,
          importedByUsername: importedBy ?? null,
        },
        select: ConfigurationImportPolicy.VersionSelection,
      });
    });
  }
}
