import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isNull } from 'es-toolkit/predicate';
import { DatabaseService } from '../database/database.service.js';
import { DatabaseErrors } from '../database/database-errors.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import {
  BusinessOutcomeSchemas,
  type BusinessOutcomeRequest,
  type BusinessOutcomeQuery,
  type BusinessOutcomeOverviewQuery,
} from './business-outcome-types.js';
import { BusinessOutcomeMessages } from './business-outcome-messages.js';
import { BusinessOutcomePolicy } from './business-outcome-policy.js';
const Validators = {
  request: SchemaCompiler.compile<BusinessOutcomeRequest>(BusinessOutcomeSchemas.Request),
  query: SchemaCompiler.compile<BusinessOutcomeQuery>(BusinessOutcomeSchemas.Query),
  overview: SchemaCompiler.compile<BusinessOutcomeOverviewQuery>(BusinessOutcomeSchemas.Overview),
} as const;
@Injectable()
export class BusinessOutcomeService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async record(input: unknown, administratorIdentifier: string) {
    if (!Validators.request(input)) {
      throw new BadRequestException(BusinessOutcomeMessages.InvalidInput);
    }

    const request = { ...input };
    const occurredAt = new Date(request.occurredAt);

    if (
      !Number.isFinite(occurredAt.getTime()) ||
      occurredAt.toISOString() !== request.occurredAt ||
      occurredAt.getTime() > Date.now()
    ) {
      throw new BadRequestException(BusinessOutcomeMessages.InvalidTimestamp);
    }

    const session = await this.database.client.session.findUnique({
      where: { identifier: request.sessionIdentifier },
      select: { createdAt: true },
    });

    if (isNull(session)) {
      throw new NotFoundException(BusinessOutcomeMessages.SessionMissing);
    }

    if (occurredAt < session.createdAt) {
      throw new BadRequestException(BusinessOutcomeMessages.InvalidTimestamp);
    }

    try {
      return await this.database.client.businessOutcome.create({
        data: { ...request, occurredAt, administratorIdentifier },
      });
    } catch (error) {
      if (!DatabaseErrors.isUniqueConstraint(error)) {
        throw error;
      }

      const existing = await this.database.client.businessOutcome.findUnique({
        where: {
          source_externalIdentifier: {
            source: request.source,
            externalIdentifier: request.externalIdentifier,
          },
        },
      });

      if (
        isNull(existing) ||
        existing.sessionIdentifier !== request.sessionIdentifier ||
        existing.kind !== request.kind ||
        existing.occurredAt.getTime() !== occurredAt.getTime() ||
        existing.provenance !== request.provenance
      ) {
        throw new ConflictException(BusinessOutcomeMessages.Conflict);
      }

      return existing;
    }
  }

  async list(input: unknown) {
    if (!Validators.query(input)) {
      throw new BadRequestException(BusinessOutcomeMessages.InvalidInput);
    }

    return this.database.client.businessOutcome.findMany({
      where: { sessionIdentifier: input.sessionIdentifier },
      orderBy: [{ occurredAt: 'desc' }, { identifier: 'asc' }],
      take: BusinessOutcomePolicy.MaximumResults,
    });
  }

  async overview(input: unknown) {
    if (!Validators.overview(input)) {
      throw new BadRequestException(BusinessOutcomeMessages.InvalidInput);
    }

    const counts = await this.database.client.businessOutcome.groupBy({
      by: ['kind', 'provenance'],
      where: { session: { version: { funnelIdentifier: input.funnelIdentifier } } },
      _count: { _all: true },
    });

    return {
      connectorConfigured: false,
      counts: counts.map((row) => ({
        kind: row.kind,
        provenance: row.provenance,
        count: row._count._all,
      })),
    };
  }
}
