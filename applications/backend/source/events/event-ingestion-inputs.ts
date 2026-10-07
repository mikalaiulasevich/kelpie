import { isPlainObject, isString } from 'es-toolkit/predicate';
import { SessionPolicy } from '../sessions/session-policy.js';
import { HttpStatus } from '@nestjs/common';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { SessionTimestamps } from '../sessions/session-timestamps.js';
import { PublicRequestError } from '../transport/public-request-error.js';
import {
  EventIngestionSchemas,
  type ObservationBatch,
  type ObservationEvent,
  type ParsedObservation,
} from './event-ingestion-types.js';
import { EventIngestionMessages } from './event-ingestion-messages.js';
import { EventRejectionCode } from './event-ingestion-policy.js';

const EventValidators = {
  identifier: new RegExp(SessionPolicy.OperationPattern),
  batch: SchemaCompiler.compile<ObservationBatch>(EventIngestionSchemas.Batch),
  event: SchemaCompiler.compile<ObservationEvent>(EventIngestionSchemas.Event),
} as const;

export const EventIngestionInputs = {
  batch(value: unknown): ReadonlyList<ParsedObservation> {
    if (!EventValidators.batch(value)) {
      throw new PublicRequestError(
        HttpStatus.BAD_REQUEST,
        EventRejectionCode.InvalidBatch,
        EventIngestionMessages.InvalidBatch,
      );
    }

    return value.events.map((element) => ({
      identifier: EventIngestionInputs.identifier(element),
      event: EventIngestionInputs.event(element),
    }));
  },

  identifier(value: unknown): Optional<string> {
    if (
      !isPlainObject(value) ||
      !isString(value.event_id) ||
      !EventValidators.identifier.test(value.event_id)
    ) {
      return undefined;
    }

    return value.event_id;
  },

  event(value: unknown): Optional<ObservationEvent> {
    if (!EventValidators.event(value) || !SessionTimestamps.isCanonical(value.client_timestamp)) {
      return undefined;
    }

    return { ...value, properties: { ...value.properties } };
  },
} as const;
