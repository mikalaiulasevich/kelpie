import { Inject, Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PublicationInputs } from '../publications/publication-inputs.js';
import { PublicationMessages } from '../publications/publication-messages.js';
import { PublicRequestError } from '../transport/public-request-error.js';
import { ConfigurationImportError } from './configuration-import-error.js';
import { ConfigurationImportService } from './configuration-import.service.js';
import type { ConfigurationList } from '../publications/publication-types.js';
import type { ConfigurationImportResult } from './configuration-import-types.js';
import { ConfigurationImportErrorCode } from './configuration-import-types.js';
import { ConfigurationImportPolicy } from './configuration-import-policy.js';

@Injectable()
export class ConfigurationManagementService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ConfigurationImportService) private readonly imports: ConfigurationImportService,
  ) {}

  async import(document: unknown): Promise<ConfigurationImportResult> {
    try {
      return await this.imports.import(document);
    } catch (error) {
      if (!(error instanceof ConfigurationImportError)) {
        throw error;
      }

      const status =
        error.code === ConfigurationImportErrorCode.Invalid
          ? HttpStatus.UNPROCESSABLE_ENTITY
          : HttpStatus.CONFLICT;
      throw new PublicRequestError(status, error.code, error.message, error.issues);
    }
  }

  async list(query: unknown): Promise<ConfigurationList> {
    const { funnelIdentifier, limit, offset } = PublicationInputs.query(query);

    return this.database.client.$transaction(async (transaction) => {
      const funnel = await transaction.funnel.findUnique({
        where: { identifier: funnelIdentifier },
        select: { identifier: true, activeVersionIdentifier: true, revision: true },
      });
      if (!funnel) {
        throw new NotFoundException(PublicationMessages.MissingFunnel);
      }

      const versions = await transaction.funnelVersion.findMany({
        where: { funnelIdentifier },
        select: ConfigurationImportPolicy.VersionSelection,
        orderBy: { version: 'desc' },
        skip: offset,
        take: limit + 1,
      });

      return {
        funnel,
        items: versions.slice(0, limit),
        nextOffset: versions.length > limit ? offset + limit : null,
      };
    });
  }
}
