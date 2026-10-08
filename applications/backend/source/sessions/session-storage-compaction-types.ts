import { Type, type Static } from 'typebox';
import { SessionStorageCompactionPolicy } from './session-storage-compaction-policy.js';

const OperationCursor = Type.Object(
  {
    sessionIdentifier: Type.String({ minLength: 1 }),
    operationIdentifier: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const Phase = Type.Object(
  {
    examined: Type.Integer({ minimum: 0 }),
    converted: Type.Integer({ minimum: 0 }),
    alreadyCompact: Type.Integer({ minimum: 0 }),
    bytesBefore: Type.Integer({ minimum: 0 }),
    bytesAfter: Type.Integer({ minimum: 0 }),
    complete: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const SessionStorageCompactionSchemas = {
  OperationCursor,
  Phase,
  Options: Type.Object(
    {
      apply: Type.Boolean(),
      batchSize: Type.Integer({
        minimum: 1,
        maximum: SessionStorageCompactionPolicy.MaximumBatchSize,
      }),
      maximumRecords: Type.Integer({
        minimum: 1,
        maximum: SessionStorageCompactionPolicy.MaximumRecords,
      }),
      operationCursor: Type.Optional(OperationCursor),
      sessionCursor: Type.Optional(Type.String({ minLength: 1 })),
    },
    { additionalProperties: false },
  ),
  Result: Type.Object(
    {
      applied: Type.Boolean(),
      operations: Type.Object(
        { ...Phase.properties, cursor: Type.Optional(OperationCursor) },
        { additionalProperties: false },
      ),
      sessions: Type.Object(
        { ...Phase.properties, cursor: Type.Optional(Type.String()) },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
} as const;

export type SessionStorageOperationCursor = Readonly<
  Static<typeof SessionStorageCompactionSchemas.OperationCursor>
>;

export type SessionStorageCompactionOptions = Readonly<
  Static<typeof SessionStorageCompactionSchemas.Options>
>;

export type SessionStorageCompactionPhase = Readonly<
  Static<typeof SessionStorageCompactionSchemas.Phase>
>;

export type SessionStorageCompactionResult = DeepReadonly<
  Static<typeof SessionStorageCompactionSchemas.Result>
>;
