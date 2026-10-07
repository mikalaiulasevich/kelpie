import { Type, type Static } from 'typebox';
import { ManagementSchemas } from '../management/management-types.js';
import { SessionCommandKind, SessionCommandPolicy } from './session-command-policy.js';

const commandProperties = {
  operationIdentifier: Type.String({ pattern: SessionCommandPolicy.UuidPattern }),
  expectedSessionRevision: Type.Integer({
    minimum: 0,
    maximum: SessionCommandPolicy.MaximumRevision,
  }),
  stepIdentifier: ManagementSchemas.Identifier,
  clientTimestamp: Type.String({ pattern: SessionCommandPolicy.TimestampPattern }),
};
const answerSchema = Type.Union([
  Type.String({ maxLength: SessionCommandPolicy.MaximumAnswerLength }),
  Type.Number(),
  Type.Array(Type.String({ maxLength: SessionCommandPolicy.MaximumAnswerLength }), {
    maxItems: SessionCommandPolicy.MaximumSelections,
  }),
  Type.Null(),
]);
export const SessionCommandSchemas = {
  Answer: Type.Object(
    { ...commandProperties, answer: answerSchema },
    { additionalProperties: false },
  ),
  Navigation: Type.Object(commandProperties, { additionalProperties: false }),
} as const;
export type SubmitSessionAnswerRequest = DeepReadonly<Static<typeof SessionCommandSchemas.Answer>>;
export type SessionNavigationRequest = Readonly<Static<typeof SessionCommandSchemas.Navigation>>;
export type SessionCommand =
  | (SubmitSessionAnswerRequest & { readonly kind: typeof SessionCommandKind.Answer })
  | (SessionNavigationRequest & {
      readonly kind: typeof SessionCommandKind.Continue | typeof SessionCommandKind.Back;
    });
