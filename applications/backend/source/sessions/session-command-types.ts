import type { FunnelConfiguration } from '@kelpie/contracts';
import type { OwnedSession } from './session-types.js';
import { SessionPolicy } from './session-policy.js';
import { Type, type Static } from 'typebox';
import { ManagementSchemas } from '../management/management-types.js';
import type { SessionCommandKind } from './session-command-policy.js';
import { SessionCommandPolicy } from './session-command-policy.js';

const SessionCommandFields = {
  Common: {
    operationIdentifier: Type.String({ pattern: SessionPolicy.OperationPattern }),
    expectedSessionRevision: Type.Integer({
      minimum: 0,
      maximum: SessionCommandPolicy.MaximumRevision,
    }),
    stepIdentifier: ManagementSchemas.Identifier,
    clientTimestamp: Type.String({ pattern: SessionPolicy.TimestampPattern }),
  },
  Answer: Type.Union([
    Type.String({ maxLength: SessionCommandPolicy.MaximumAnswerLength }),
    Type.Number(),
    Type.Array(Type.String({ maxLength: SessionCommandPolicy.MaximumAnswerLength }), {
      maxItems: SessionCommandPolicy.MaximumSelections,
    }),
    Type.Null(),
  ]),
} as const;

export const SessionCommandSchemas = {
  Answer: Type.Object(
    { ...SessionCommandFields.Common, answer: SessionCommandFields.Answer },
    { additionalProperties: false },
  ),
  Navigation: Type.Object(SessionCommandFields.Common, { additionalProperties: false }),
} as const;

export type SubmitSessionAnswerRequest = DeepReadonly<Static<typeof SessionCommandSchemas.Answer>>;

export type SessionNavigationRequest = Readonly<Static<typeof SessionCommandSchemas.Navigation>>;

export type SessionCommand =
  | (SubmitSessionAnswerRequest & { readonly kind: typeof SessionCommandKind.Answer })
  | (SessionNavigationRequest & {
      readonly kind: typeof SessionCommandKind.Continue | typeof SessionCommandKind.Back;
    });

export interface SessionCommandContext {
  readonly record: OwnedSession;
  readonly credentialHash: string;
  readonly command: SessionCommand;
  readonly revision: number;
  readonly configuration: FunnelConfiguration;
}
