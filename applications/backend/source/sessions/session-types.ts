import { Type, type Static } from 'typebox';
import { ExperimentVariant, type FunnelConfiguration, type FunnelResult } from '@kelpie/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import { SessionPolicy } from './session-policy.js';

const answerValue = Type.Union([Type.String(), Type.Number(), Type.Array(Type.String())]);

export const SessionSchemas = {
  Create: Type.Object({ operationIdentifier: Type.String({ pattern: SessionPolicy.OperationPattern }), funnelIdentifier: Type.String({ pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$', maxLength: 100 }), clientTimestamp: Type.String({ pattern: SessionPolicy.TimestampPattern }) }, { additionalProperties: false }),
  Query: Type.Record(Type.String(), Type.String({ maxLength: SessionPolicy.MaximumAcquisitionCharacters }), { maxProperties: 16 }),
  State: Type.Object({ sessionIdentifier: Type.String(), revision: Type.Integer(), versionIdentifier: Type.String(), funnelIdentifier: Type.String(), funnelVersion: Type.Integer(), variant: Type.Enum(ExperimentVariant), configuration: Type.Unknown(), currentStepIdentifier: Type.String(), answers: Type.Array(Type.Object({ stepIdentifier: Type.String(), value: answerValue, confirmationRevision: Type.Union([Type.Integer(), Type.Null()]) })), progress: Type.Object({ completed: Type.Integer(), total: Type.Integer() }), result: Type.Unknown() }),
} as const;

export type CreateSessionRequest = Readonly<Static<typeof SessionSchemas.Create>>;
export type SessionQuery = Readonly<Static<typeof SessionSchemas.Query>>;
export type SessionState = DeepReadonly<Omit<Static<typeof SessionSchemas.State>, 'configuration' | 'result'>> & Readonly<{ configuration: FunnelConfiguration; result: FunnelResult | null }>;
export type OwnedSession = Prisma.SessionGetPayload<{ include: typeof SessionPolicy.RecordInclude }>;
export type CurrentSessionResponse = Readonly<{ state: SessionState | null; expired: boolean }>;
export type CredentialVerification = Readonly<{ hash: string | null; expired: boolean }>;
