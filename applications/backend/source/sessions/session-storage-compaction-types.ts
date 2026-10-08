import { Type, type Static } from 'typebox';

export const SessionStorageCompactionSchemas = {
  OperationCursor: Type.Object(
    {
      sessionIdentifier: Type.String(),
      operationIdentifier: Type.String(),
    },
    { additionalProperties: false },
  ),
} as const;

export type SessionStorageOperationCursor = Static<
  typeof SessionStorageCompactionSchemas.OperationCursor
>;

export interface SessionStorageCompactionOptions {
  readonly apply: boolean;
  readonly batchSize: number;
  readonly maximumRecords: number;
  readonly operationCursor?: Optional<SessionStorageOperationCursor>;
  readonly sessionCursor?: Optional<string>;
}

export interface SessionStorageCompactionPhase {
  readonly examined: number;
  readonly converted: number;
  readonly alreadyCompact: number;
  readonly bytesBefore: number;
  readonly bytesAfter: number;
  readonly complete: boolean;
}

export interface SessionStorageCompactionResult {
  readonly applied: boolean;
  readonly operations: SessionStorageCompactionPhase & {
    readonly cursor: Optional<SessionStorageOperationCursor>;
  };
  readonly sessions: SessionStorageCompactionPhase & { readonly cursor: Optional<string> };
}

export interface SessionStorageSnapshotMeasurement {
  readonly compact: import('../../generated/prisma/client.js').Prisma.InputJsonObject;
  readonly alreadyCompact: boolean;
  readonly before: number;
  readonly after: number;
}
