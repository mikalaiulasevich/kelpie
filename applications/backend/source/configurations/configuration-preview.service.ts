import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { DatabaseService } from '../database/database.service.js';
import { SessionService } from '../sessions/session.service.js';
import { SessionInputs } from '../sessions/session-inputs.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { ConfigurationManagementInputs } from './configuration-management-inputs.js';
import { ConfigurationManagementMessages } from './configuration-management-messages.js';
import { ConfigurationImportDocument } from './configuration-import-document.js';
import {
  ConfigurationPreviewSchema,
  type ConfigurationPreviewRequest,
} from './configuration-preview-types.js';

const validate = SchemaCompiler.compile<ConfigurationPreviewRequest>(ConfigurationPreviewSchema);

@Injectable()
export class ConfigurationPreviewService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  async create(
    identifier: unknown,
    input: unknown,
    administratorIdentifier: string,
    reply: FastifyReply,
  ) {
    const versionIdentifier = ConfigurationManagementInputs.identifier(identifier);

    if (!validate(input)) {
      throw new BadRequestException(ConfigurationManagementMessages.InvalidPreview);
    }

    const record = await this.database.client.funnelVersion.findUnique({
      where: { identifier: versionIdentifier },
    });

    if (!record) {
      throw new NotFoundException(ConfigurationManagementMessages.MissingVersion);
    }

    const prepared = ConfigurationImportDocument.prepare(record.document);

    if (!ConfigurationImportDocument.matchesVersion(record, prepared)) {
      throw new Error(ConfigurationManagementMessages.CorruptedVersion);
    }

    const body = SessionInputs.create({
      operationIdentifier: input.operationIdentifier,
      clientTimestamp: input.clientTimestamp,
      funnelIdentifier: record.funnelIdentifier,
    });

    return this.sessions.preview(
      reply,
      body,
      { identifier: record.identifier, configuration: prepared.configuration },
      input.variant,
      administratorIdentifier,
      input.acquisition ?? {},
    );
  }
}
