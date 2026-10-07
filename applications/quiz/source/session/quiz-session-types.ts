import { Type, type Static } from 'typebox';
import type { FunnelConfiguration, FunnelResult, StepAnswer } from '@kelpie/contracts';

export const QuizSessionSchemas = {
  Result: Type.Union([
    Type.Null(),
    Type.Object({
      id: Type.String(),
      title: Type.String(),
      summary: Type.String(),
      recommendations: Type.Array(Type.String()),
      cta: Type.Object({ label: Type.String(), action: Type.Literal('expand_recommendation') }),
    }),
  ]),
  Pending: Type.Object({
    path: Type.String({ pattern: '^/api/sessions' }),
    sessionIdentifier: Type.Optional(Type.String()),
    body: Type.Record(
      Type.String(),
      Type.Union([Type.String(), Type.Number(), Type.Array(Type.String()), Type.Null()]),
    ),
  }),
  Answer: Type.Union([Type.String(), Type.Number(), Type.Array(Type.String()), Type.Null()]),
  Envelope: Type.Object({ state: Type.Unknown(), expired: Type.Boolean() }),
  State: Type.Object({
    sessionIdentifier: Type.String(),
    revision: Type.Integer(),
    versionIdentifier: Type.String(),
    funnelIdentifier: Type.String(),
    funnelVersion: Type.Integer(),
    variant: Type.Union([Type.Literal('A'), Type.Literal('B')]),
    configuration: Type.Unknown(),
    currentStepIdentifier: Type.String(),
    answers: Type.Array(
      Type.Object({
        stepIdentifier: Type.String(),
        value: Type.Union([Type.String(), Type.Number(), Type.Array(Type.String()), Type.Null()]),
        confirmationRevision: Type.Union([Type.Integer(), Type.Null()]),
      }),
    ),
    progress: Type.Object({ completed: Type.Integer(), total: Type.Integer() }),
    result: Type.Unknown(),
  }),
  Events: Type.Array(
    Type.Object({
      event_id: Type.String(),
      session_id: Type.String(),
      name: Type.String(),
      client_timestamp: Type.String(),
      step_id: Type.String(),
      observationRevision: Type.Integer(),
      properties: Type.Record(Type.String(), Type.Union([Type.String(), Type.Number()])),
    }),
  ),
  Receipts: Type.Object({
    receipts: Type.Array(
      Type.Object({
        event_id: Type.Optional(Type.String()),
        status: Type.Union([
          Type.Literal('accepted'),
          Type.Literal('duplicate'),
          Type.Literal('rejected'),
        ]),
      }),
    ),
  }),
} as const;

export type QuizSessionState = Omit<
  Static<typeof QuizSessionSchemas.State>,
  'configuration' | 'result'
> & { readonly configuration: FunnelConfiguration; readonly result: FunnelResult | null };

export type QuizObservation = Static<typeof QuizSessionSchemas.Events>[number];

export type QuizObservationInput = Pick<QuizObservation, 'name' | 'properties'>;

export interface QuizPendingCommand {
  readonly path: string;
  readonly sessionIdentifier?: string;
  readonly body: Readonly<Record<string, TextOrNumber | StepAnswer | null>>;
}
