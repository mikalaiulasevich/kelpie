import { Type, type Static } from 'typebox';
import { ExperimentVariant, type FunnelConfiguration, type FunnelResult } from '@kelpie/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import { ManagementSchemas } from '../management/management-types.js';
import { SessionPolicy } from './session-policy.js';

const SessionFields = {
  Answer: Type.Object({
    stepIdentifier: Type.String(),
    value: Type.Union([Type.String(), Type.Number(), Type.Array(Type.String()), Type.Null()]),
    confirmationRevision: Type.Union([Type.Integer(), Type.Null()]),
  }),
  Progress: Type.Object({ completed: Type.Integer(), total: Type.Integer() }),
} as const;

export const SessionSchemas = {
  Credential: Type.Object({ hash: Type.String(), value: Type.String() }),
  Create: Type.Object(
    {
      operationIdentifier: Type.String({ pattern: SessionPolicy.OperationPattern }),
      funnelIdentifier: ManagementSchemas.Identifier,
      clientTimestamp: Type.String({ pattern: SessionPolicy.TimestampPattern }),
    },
    { additionalProperties: false },
  ),
  Query: Type.Record(
    Type.String(),
    Type.String({ maxLength: SessionPolicy.MaximumAcquisitionCharacters }),
    { maxProperties: SessionPolicy.MaximumQueryParameters },
  ),
  State: Type.Object({
    sessionIdentifier: Type.String(),
    revision: Type.Integer(),
    versionIdentifier: Type.String(),
    funnelIdentifier: Type.String(),
    funnelVersion: Type.Integer(),
    variant: Type.Enum(ExperimentVariant),
    configuration: Type.Unknown(),
    currentStepIdentifier: Type.String(),
    answers: Type.Array(SessionFields.Answer),
    progress: SessionFields.Progress,
    result: Type.Unknown(),
  }),
} as const;

export type IssuedSessionCredential = Readonly<Static<typeof SessionSchemas.Credential>>;

export type CreateSessionRequest = Readonly<Static<typeof SessionSchemas.Create>>;

export type SessionQuery = Readonly<Static<typeof SessionSchemas.Query>>;

export type SessionState = DeepReadonly<
  Omit<Static<typeof SessionSchemas.State>, 'configuration' | 'result'>
> &
  Readonly<{ configuration: FunnelConfiguration; result: FunnelResult | null }>;

export type OwnedSession = Prisma.SessionGetPayload<{
  include: typeof SessionPolicy.RecordInclude;
}>;

export type CurrentSessionResponse = Readonly<{ state: SessionState | null; expired: boolean }>;

export type CredentialVerification = Readonly<{ hash: string | null; expired: boolean }>;

export type SessionAnswerSource = Readonly<{
  answers: ReadonlyList<
    Readonly<{ stepIdentifier: string; value: unknown; confirmationRevision: number | null }>
  >;
}>;

export type ActiveSessionConfiguration = Readonly<{
  identifier: string;
  configuration: FunnelConfiguration;
}>;
