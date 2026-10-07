import { sortBy } from 'es-toolkit/array';
import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { isNull, isUndefined } from 'es-toolkit/predicate';
import type { FastifyRequest } from 'fastify';
import type { Event, Prisma } from '../../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import { DatabaseErrors } from '../database/database-errors.js';
import { SessionOwnershipService } from '../sessions/session-ownership.service.js';
import { SessionRecords } from '../sessions/session-records.js';
import { SessionPolicy } from '../sessions/session-policy.js';
import type { OwnedSession } from '../sessions/session-types.js';
import { EventEligibility } from './event-eligibility.js';
import { EventIngestionInputs } from './event-ingestion-inputs.js';
import {
  EventIngestionPolicy,
  EventReceiptStatus,
  EventRejectionCode,
} from './event-ingestion-policy.js';
import type {
  EventReceipt,
  EventWriteCommand,
  EventBatchResponse,
  ObservationEvent,
  ParsedObservation,
  StoredEventReceipt,
} from './event-ingestion-types.js';

const EventRecords = {
  fingerprint(session: OwnedSession, event: ObservationEvent): string {
    return createHash(SessionPolicy.HashAlgorithm)
      .update(
        JSON.stringify([
          event.event_id,
          session.identifier,
          session.versionIdentifier,
          session.experimentIdentifier,
          session.variant,
          session.acquisitionParameters,
          event.name,
          event.step_id,
          event.client_timestamp,
          event.observationRevision,
          sortBy(Object.entries(event.properties), [([key]) => key]),
        ]),
      )
      .digest(SessionPolicy.HashEncoding);
  },

  receipt(position: number, record: Event, status: StoredEventReceipt['status']): EventReceipt {
    return {
      position,
      event_id: record.identifier,
      status,
      server_timestamp: record.serverTimestamp.toISOString(),
    };
  },

  rejected(
    position: number,
    identifier: Optional<string>,
    code: ValueOf<typeof EventRejectionCode>,
  ): EventReceipt {
    return {
      position,
      ...(isUndefined(identifier) ? {} : { event_id: identifier }),
      status: EventReceiptStatus.Rejected,
      code,
    };
  },
} as const;

@Injectable()
export class EventIngestionService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(SessionOwnershipService) private readonly ownership: SessionOwnershipService,
  ) {}

  async ingest(request: FastifyRequest, body: unknown): Promise<EventBatchResponse> {
    this.ownership.assertMutation(request);
    const entries = EventIngestionInputs.batch(body);
    const credential = await this.ownership.requireCredential(request);
    const receipts: EventReceipt[] = [];

    for (const [position, entry] of entries.entries()) {
      receipts.push(await this.accept(credential, entry, position));
    }

    return { receipts };
  }

  private async accept(
    credential: string,
    entry: ParsedObservation,
    position: number,
  ): Promise<EventReceipt> {
    const session = await SessionRecords.requireOwned(this.database.client, credential);
    const event = entry.event;

    if (isUndefined(event)) {
      return EventRecords.rejected(position, entry.identifier, EventRejectionCode.Invalid);
    }

    const rejection = await EventEligibility.rejection(this.database.client, session, event);

    if (!isUndefined(rejection)) {
      return EventRecords.rejected(position, event.event_id, rejection);
    }

    const command: EventWriteCommand = {
      credential,
      event,
      fingerprint: EventRecords.fingerprint(session, event),
      position,
    };

    try {
      return await this.database.client.$transaction((transaction) =>
        this.persist(transaction, command),
      );
    } catch (error) {
      if (!DatabaseErrors.isUniqueConstraint(error)) {
        throw error;
      }

      return this.database.client.$transaction((transaction) => this.persist(transaction, command));
    }
  }

  private async persist(
    transaction: Prisma.TransactionClient,
    command: EventWriteCommand,
  ): Promise<EventReceipt> {
    const { credential, event, fingerprint, position } = command;
    const session = await SessionRecords.requireOwned(transaction, credential);
    const existing = await transaction.event.findUnique({ where: { identifier: event.event_id } });

    if (!isNull(existing)) {
      if (
        existing.sessionIdentifier !== session.identifier ||
        existing.contentFingerprint !== fingerprint
      ) {
        return EventRecords.rejected(position, event.event_id, EventRejectionCode.Conflict);
      }

      return EventRecords.receipt(position, existing, EventReceiptStatus.Duplicate);
    }

    const record = await transaction.event.create({
      data: {
        identifier: event.event_id,
        contentFingerprint: fingerprint,
        sessionIdentifier: session.identifier,
        name: event.name,
        source: EventIngestionPolicy.Source,
        clientTimestamp: new Date(event.client_timestamp),
        stepIdentifier: event.step_id,
        properties: event.properties,
        observationRevision: event.observationRevision,
      },
    });

    return EventRecords.receipt(position, record, EventReceiptStatus.Accepted);
  }
}
