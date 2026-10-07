import type { StepType } from '@kelpie/contracts';
import type { Prisma, Session } from '../../generated/prisma/client.js';
import type { SessionTransitionKind, SessionEventName } from './session-event-policy.js';

export interface SessionTransitionEvent {
  readonly operationIdentifier: string;
  readonly kind: SessionTransitionKind;
  readonly fromStepIdentifier: string;
  readonly toStepIdentifier: string;
  readonly clientTimestamp: string;
  readonly answerKind?: Exclude<StepType, typeof StepType.Information | typeof StepType.Result>;
}

export interface AuthoritativeSessionEvent {
  readonly name: ValueOf<typeof SessionEventName>;
  readonly clientTimestamp: string;
  readonly stepIdentifier?: string;
  readonly properties: Prisma.InputJsonObject;
}

export type SessionEventOwner = Pick<Session,
  'identifier' | 'versionIdentifier' | 'experimentIdentifier' | 'variant' | 'acquisitionParameters'
>;
