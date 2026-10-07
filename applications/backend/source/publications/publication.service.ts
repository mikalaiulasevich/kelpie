import {
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, type Publication } from '../../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import { ConfigurationImportDocument } from '../configurations/configuration-import-document.js';
import { PublicRequestError } from '../transport/public-request-error.js';
import { ManagementQueries } from '../management/management-queries.js';
import { ManagementRecords } from '../management/management-records.js';
import type { FunnelReference } from '../management/management-types.js';
import { PublicationInputs } from './publication-inputs.js';
import { PublicationMessages } from './publication-messages.js';
import {
  PublicationAction,
  PublicationPolicy,
  PublicationErrorCode,
} from './publication-policy.js';
import type {
  PublicationIntent,
  PublicationResponse,
  PublicationHistory,
} from './publication-types.js';

const PublicationRecords = {
  fingerprint(intent: PublicationIntent): string {
    return createHash(PublicationPolicy.HashAlgorithm)
      .update(
        JSON.stringify([
          intent.action,
          intent.administratorIdentifier,
          intent.funnelIdentifier,
          intent.expectedRevision,
          intent.action === PublicationAction.Publish ? intent.targetVersionIdentifier : null,
        ]),
      )
      .digest(PublicationPolicy.HashEncoding);
  },

  response(publication: Publication): PublicationResponse {
    return {
      identifier: publication.identifier,
      operationIdentifier: publication.operationIdentifier,
      action: publication.action,
      administratorIdentifier: publication.administratorIdentifier,
      funnelIdentifier: publication.funnelIdentifier,
      targetVersionIdentifier: publication.targetVersionIdentifier,
      previousVersionIdentifier: publication.previousVersionIdentifier,
      revision: publication.revision,
      createdAt: publication.createdAt.toISOString(),
    };
  },

  replay(publication: Publication, fingerprint: string): PublicationResponse {
    if (publication.requestFingerprint !== fingerprint) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        PublicationErrorCode.Conflict,
        PublicationMessages.Conflict,
      );
    }

    return PublicationRecords.response(publication);
  },
} as const;

const PublicationChecks = {
  expectedRevision(actual: number, expected: number): void {
    if (actual !== expected) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        PublicationErrorCode.StaleRevision,
        PublicationMessages.StaleRevision,
      );
    }
  },

  inactiveTarget(
    activeIdentifier: FunnelReference['activeVersionIdentifier'],
    targetIdentifier: string,
  ): void {
    if (activeIdentifier === targetIdentifier) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        PublicationErrorCode.AlreadyActive,
        PublicationMessages.AlreadyActive,
      );
    }
  },
} as const;

@Injectable()
export class PublicationService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  publish(document: unknown, administratorIdentifier: string): Promise<PublicationResponse> {
    return this.execute({
      ...PublicationInputs.publish(document),
      action: PublicationAction.Publish,
      administratorIdentifier,
    });
  }

  rollback(document: unknown, administratorIdentifier: string): Promise<PublicationResponse> {
    return this.execute({
      ...PublicationInputs.rollback(document),
      action: PublicationAction.Rollback,
      administratorIdentifier,
    });
  }

  async history(query: unknown): Promise<PublicationHistory> {
    const pagination = ManagementQueries.read(query);
    const { funnelIdentifier, limit, offset } = pagination;

    return this.database.client.$transaction(async (transaction) => {
      const funnel = await ManagementRecords.readFunnel(transaction, funnelIdentifier);

      const publications = await transaction.publication.findMany({
        where: { funnelIdentifier },
        orderBy: { revision: 'desc' },
        skip: offset,
        take: limit + 1,
      });

      const page = ManagementRecords.page(publications, pagination);

      return { funnel, ...page, items: page.items.map(PublicationRecords.response) };
    });
  }

  private async execute(intent: PublicationIntent): Promise<PublicationResponse> {
    const fingerprint = PublicationRecords.fingerprint(intent);
    const existing = await this.database.client.publication.findUnique({
      where: { operationIdentifier: intent.operationIdentifier },
    });
    if (existing) {
      return PublicationRecords.replay(existing, fingerprint);
    }

    try {
      return await this.database.client.$transaction(async (transaction) => {
        const repeated = await transaction.publication.findUnique({
          where: { operationIdentifier: intent.operationIdentifier },
        });
        if (repeated) {
          return PublicationRecords.replay(repeated, fingerprint);
        }

        return this.activate(transaction, intent, fingerprint);
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== PublicationPolicy.UniqueConstraintCode
      ) {
        throw error;
      }

      const winner = await this.database.client.publication.findUnique({
        where: { operationIdentifier: intent.operationIdentifier },
      });
      if (!winner) {
        throw error;
      }

      return PublicationRecords.replay(winner, fingerprint);
    }
  }

  private async activate(
    transaction: Prisma.TransactionClient,
    intent: PublicationIntent,
    fingerprint: string,
  ): Promise<PublicationResponse> {
    const funnel = await ManagementRecords.readFunnel(transaction, intent.funnelIdentifier);
    PublicationChecks.expectedRevision(funnel.revision, intent.expectedRevision);

    const targetIdentifier = await this.targetIdentifier(transaction, intent);
    PublicationChecks.inactiveTarget(funnel.activeVersionIdentifier, targetIdentifier);

    await this.validateTarget(transaction, intent.funnelIdentifier, targetIdentifier);
    const revision = await this.updateActiveVersion(transaction, funnel, targetIdentifier);

    return this.recordPublication(
      transaction,
      intent,
      fingerprint,
      funnel,
      targetIdentifier,
      revision,
    );
  }

  private async updateActiveVersion(
    transaction: Prisma.TransactionClient,
    funnel: FunnelReference,
    targetIdentifier: string,
  ): Promise<number> {
    const revision = funnel.revision + 1;
    const changed = await transaction.funnel.updateMany({
      where: { identifier: funnel.identifier, revision: funnel.revision },
      data: { activeVersionIdentifier: targetIdentifier, revision },
    });
    if (changed.count !== 1) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        PublicationErrorCode.StaleRevision,
        PublicationMessages.StaleRevision,
      );
    }

    return revision;
  }

  private async recordPublication(
    transaction: Prisma.TransactionClient,
    intent: PublicationIntent,
    fingerprint: string,
    funnel: FunnelReference,
    targetIdentifier: string,
    revision: number,
  ): Promise<PublicationResponse> {
    const publication = await transaction.publication.create({
      data: {
        operationIdentifier: intent.operationIdentifier,
        requestFingerprint: fingerprint,
        action: intent.action,
        administratorIdentifier: intent.administratorIdentifier,
        funnelIdentifier: funnel.identifier,
        targetVersionIdentifier: targetIdentifier,
        previousVersionIdentifier: funnel.activeVersionIdentifier,
        revision,
      },
    });

    return PublicationRecords.response(publication);
  }

  private async targetIdentifier(
    transaction: Prisma.TransactionClient,
    intent: PublicationIntent,
  ): Promise<string> {
    if (intent.action === PublicationAction.Publish) {
      return intent.targetVersionIdentifier;
    }

    const previous = await transaction.publication.findFirst({
      where: { funnelIdentifier: intent.funnelIdentifier },
      orderBy: { revision: 'desc' },
    });
    if (!previous?.previousVersionIdentifier) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        PublicationErrorCode.NoPreviousVersion,
        PublicationMessages.NoPreviousVersion,
      );
    }

    return previous.previousVersionIdentifier;
  }

  private async validateTarget(
    transaction: Prisma.TransactionClient,
    funnelIdentifier: string,
    identifier: string,
  ): Promise<void> {
    const target = await transaction.funnelVersion.findFirst({
      where: { identifier, funnelIdentifier },
    });
    if (!target) {
      throw new NotFoundException(PublicationMessages.MissingVersion);
    }

    try {
      const prepared = ConfigurationImportDocument.prepare(target.document);
      if (!ConfigurationImportDocument.matchesVersion(target, prepared)) {
        throw new Error(PublicationMessages.InvalidStoredConfiguration);
      }
    } catch {
      throw new UnprocessableEntityException(PublicationMessages.InvalidStoredConfiguration);
    }
  }
}
