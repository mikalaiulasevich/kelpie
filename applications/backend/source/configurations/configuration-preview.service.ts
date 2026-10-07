import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ExperimentVariant } from '@kelpie/contracts';
import { Type, type Static } from 'typebox';
import type { FastifyReply } from 'fastify';
import { DatabaseService } from '../database/database.service.js';
import { SessionService } from '../sessions/session.service.js';
import { SessionPolicy } from '../sessions/session-policy.js';
import { SessionInputs } from '../sessions/session-inputs.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { ConfigurationManagementInputs } from './configuration-management-inputs.js';
import { ConfigurationManagementMessages } from './configuration-management-messages.js';
import { ConfigurationImportDocument } from './configuration-import-document.js';

const previewSchema = Type.Object(
  {
    operationIdentifier: Type.String({ pattern: SessionPolicy.OperationPattern }),
    clientTimestamp: Type.String({ pattern: SessionPolicy.TimestampPattern }),
    variant: Type.Enum(ExperimentVariant),
  },
  { additionalProperties: false },
);

const validate = SchemaCompiler.compile<Static<typeof previewSchema>>(previewSchema);

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
    );
  }
}
