import { ExperimentVariant } from '@kelpie/contracts';
import { Type, type Static } from 'typebox';
import { SessionPolicy } from '../sessions/session-policy.js';
import { EventReceiptStatus, EventRejectionCode } from './event-ingestion-policy.js';
import { EventIngestionPolicy, ObservationName } from './event-ingestion-policy.js';

const EventFields = {
  Identifier: Type.String({
    minLength: 1,
    maxLength: EventIngestionPolicy.MaximumIdentifierLength,
  }),
  Text: Type.String({ maxLength: EventIngestionPolicy.MaximumTextLength }),
  Uuid: Type.String({ pattern: SessionPolicy.OperationPattern }),
} as const;

export const EventIngestionSchemas = {
  Batch: Type.Object(
    {
      events: Type.Array(Type.Unknown(), {
        minItems: 1,
        maxItems: EventIngestionPolicy.MaximumBatchSize,
      }),
    },
    { additionalProperties: false },
  ),
  Event: Type.Object(
    {
      event_id: EventFields.Uuid,
      session_id: EventFields.Uuid,
      name: Type.Enum(ObservationName),
      client_timestamp: Type.String({ pattern: SessionPolicy.TimestampPattern }),
      step_id: EventFields.Identifier,
      observationRevision: Type.Integer({
        minimum: 0,
        maximum: EventIngestionPolicy.MaximumRevision,
      }),
      properties: Type.Record(Type.String(), Type.Union([EventFields.Text, Type.Integer()]), {
        maxProperties: 3,
      }),
      funnel_id: Type.Optional(EventFields.Identifier),
      funnel_version: Type.Optional(Type.Integer({ minimum: 1 })),
      experiment_id: Type.Optional(EventFields.Identifier),
      variant: Type.Optional(Type.Enum(ExperimentVariant)),
      utm_source: Type.Optional(EventFields.Text),
      utm_medium: Type.Optional(EventFields.Text),
      utm_campaign: Type.Optional(EventFields.Text),
      utm_term: Type.Optional(EventFields.Text),
      utm_content: Type.Optional(EventFields.Text),
    },
    { additionalProperties: false },
  ),
} as const;

export type ObservationEvent = Readonly<Static<typeof EventIngestionSchemas.Event>>;

export type ObservationBatch = Static<typeof EventIngestionSchemas.Batch>;

export const EventReceiptSchemas = {
  Stored: Type.Object({
    position: Type.Integer({ minimum: 0 }),
    event_id: EventFields.Uuid,
    status: Type.Union([
      Type.Literal(EventReceiptStatus.Accepted),
      Type.Literal(EventReceiptStatus.Duplicate),
    ]),
    server_timestamp: Type.String({ pattern: SessionPolicy.TimestampPattern }),
  }),
  Rejected: Type.Object({
    position: Type.Integer({ minimum: 0 }),
    event_id: Type.Optional(EventFields.Uuid),
    status: Type.Literal(EventReceiptStatus.Rejected),
    code: Type.Enum(EventRejectionCode),
  }),
} as const;

export type StoredEventReceipt = Readonly<Static<typeof EventReceiptSchemas.Stored>>;

export type RejectedEventReceipt = Readonly<Static<typeof EventReceiptSchemas.Rejected>>;

export type EventReceipt = StoredEventReceipt | RejectedEventReceipt;

export interface EventBatchResponse {
  readonly receipts: ReadonlyList<EventReceipt>;
}

export interface ParsedObservation {
  readonly identifier: Optional<string>;
  readonly event: Optional<ObservationEvent>;
}
