import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, type Publication } from '../../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import { ConfigurationImportDocument } from '../configurations/configuration-import-document.js';
import { PublicationInputs } from './publication-inputs.js';
import { PublicationMessages } from './publication-messages.js';
import { PublicationAction, PublicationPolicy } from './publication-policy.js';
import type { PublicationIntent, PublicationResponse } from './publication-types.js';

const PublicationRecords = {
  fingerprint(intent: PublicationIntent): string {
    return createHash(PublicationPolicy.HashAlgorithm).update(JSON.stringify([
      intent.action, intent.administratorIdentifier, intent.funnelIdentifier,
      intent.expectedRevision, intent.targetVersionIdentifier ?? null,
    ])).digest(PublicationPolicy.HashEncoding);
  },
  response(publication: Publication): PublicationResponse {
    const { requestFingerprint: _fingerprint, createdAt, ...metadata } = publication;
    return { ...metadata, createdAt: createdAt.toISOString() };
  },
  replay(publication: Publication, fingerprint: string): PublicationResponse {
    if (publication.requestFingerprint !== fingerprint) { throw new ConflictException(PublicationMessages.Conflict); }
    return PublicationRecords.response(publication);
  },
} as const;

@Injectable()
export class PublicationService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  publish(document: unknown, administratorIdentifier: string): Promise<PublicationResponse> {
    return this.execute({ ...PublicationInputs.publish(document), action: PublicationAction.Publish, administratorIdentifier });
  }
  rollback(document: unknown, administratorIdentifier: string): Promise<PublicationResponse> {
    return this.execute({ ...PublicationInputs.rollback(document), action: PublicationAction.Rollback, administratorIdentifier });
  }
  async history(query: unknown) {
    const { funnelIdentifier, limit, offset } = PublicationInputs.query(query);
    return this.database.client.$transaction(async (transaction) => {
      const funnel = await transaction.funnel.findUnique({ where: { identifier: funnelIdentifier }, select: { identifier: true, activeVersionIdentifier: true, revision: true } });
      if (!funnel) { throw new NotFoundException(PublicationMessages.MissingFunnel); }
      const publications = await transaction.publication.findMany({ where: { funnelIdentifier }, orderBy: { revision: 'desc' }, skip: offset, take: limit + 1 });
      return { funnel, items: publications.slice(0, limit).map(PublicationRecords.response), nextOffset: publications.length > limit ? offset + limit : null };
    });
  }
  private async execute(intent: PublicationIntent): Promise<PublicationResponse> {
    const fingerprint = PublicationRecords.fingerprint(intent);
    const existing = await this.database.client.publication.findUnique({ where: { operationIdentifier: intent.operationIdentifier } });
    if (existing) { return PublicationRecords.replay(existing, fingerprint); }
    try {
      return await this.database.client.$transaction(async (transaction) => {
        const repeated = await transaction.publication.findUnique({ where: { operationIdentifier: intent.operationIdentifier } });
        if (repeated) { return PublicationRecords.replay(repeated, fingerprint); }
        return this.activate(transaction, intent, fingerprint);
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== PublicationPolicy.UniqueConstraintCode) { throw error; }
      const winner = await this.database.client.publication.findUnique({ where: { operationIdentifier: intent.operationIdentifier } });
      if (!winner) { throw error; }
      return PublicationRecords.replay(winner, fingerprint);
    }
  }
  private async activate(transaction: Prisma.TransactionClient, intent: PublicationIntent, fingerprint: string): Promise<PublicationResponse> {
    const funnel = await transaction.funnel.findUnique({ where: { identifier: intent.funnelIdentifier } });
    if (!funnel) { throw new NotFoundException(PublicationMessages.MissingFunnel); }
    if (funnel.revision !== intent.expectedRevision) { throw new ConflictException(PublicationMessages.StaleRevision); }
    const targetIdentifier = await this.targetIdentifier(transaction, intent);
    if (funnel.activeVersionIdentifier === targetIdentifier) { throw new ConflictException(PublicationMessages.AlreadyActive); }
    await this.validateTarget(transaction, intent.funnelIdentifier, targetIdentifier);
    const revision = funnel.revision + 1;
    const changed = await transaction.funnel.updateMany({ where: { identifier: funnel.identifier, revision: intent.expectedRevision }, data: { activeVersionIdentifier: targetIdentifier, revision } });
    if (changed.count !== 1) { throw new ConflictException(PublicationMessages.StaleRevision); }
    const publication = await transaction.publication.create({ data: {
      operationIdentifier: intent.operationIdentifier, requestFingerprint: fingerprint,
      action: intent.action, administratorIdentifier: intent.administratorIdentifier,
      funnelIdentifier: funnel.identifier, targetVersionIdentifier: targetIdentifier,
      previousVersionIdentifier: funnel.activeVersionIdentifier, revision,
    } });
    return PublicationRecords.response(publication);
  }
  private async targetIdentifier(transaction: Prisma.TransactionClient, intent: PublicationIntent): Promise<string> {
    if (intent.action === PublicationAction.Publish && intent.targetVersionIdentifier) { return intent.targetVersionIdentifier; }
    const previous = await transaction.publication.findFirst({ where: { funnelIdentifier: intent.funnelIdentifier }, orderBy: { revision: 'desc' } });
    if (!previous?.previousVersionIdentifier) { throw new ConflictException(PublicationMessages.NoPreviousVersion); }
    return previous.previousVersionIdentifier;
  }
  private async validateTarget(transaction: Prisma.TransactionClient, funnelIdentifier: string, identifier: string): Promise<void> {
    const target = await transaction.funnelVersion.findFirst({ where: { identifier, funnelIdentifier } });
    if (!target) { throw new NotFoundException(PublicationMessages.MissingVersion); }
    try {
      const prepared = ConfigurationImportDocument.prepare(target.document);
      if (prepared.checksum !== target.checksum || prepared.configuration.funnelId !== funnelIdentifier || prepared.configuration.version !== target.version) { throw new Error(PublicationMessages.InvalidStoredConfiguration); }
    } catch {
      throw new UnprocessableEntityException(PublicationMessages.InvalidStoredConfiguration);
    }
  }
}
