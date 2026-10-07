import { createHash, randomUUID } from 'node:crypto';
import { isUndefined } from 'es-toolkit/predicate';
import type { Prisma } from '../../generated/prisma/client.js';
import { SessionEventName, SessionEventPolicy, SessionTransitionKind } from './session-event-policy.js';
import type { AuthoritativeSessionEvent, SessionEventOwner, SessionTransitionEvent } from './session-event-types.js';

const SessionEventRecords = {
  async insert(transaction: Prisma.TransactionClient, session: SessionEventOwner, event: AuthoritativeSessionEvent): Promise<void> {
    const identifier = randomUUID();
    const contentFingerprint = createHash(SessionEventPolicy.HashAlgorithm).update(JSON.stringify([
      identifier, session.identifier, session.versionIdentifier, session.experimentIdentifier,
      session.variant, session.acquisitionParameters, event.name, event.clientTimestamp,
      event.stepIdentifier ?? null, event.properties,
    ])).digest(SessionEventPolicy.HashEncoding);

    await transaction.event.create({ data: {
      identifier,
      sessionIdentifier: session.identifier,
      contentFingerprint,
      name: event.name,
      source: SessionEventPolicy.Source,
      clientTimestamp: new Date(event.clientTimestamp),
      stepIdentifier: event.stepIdentifier ?? null,
      properties: event.properties,
    } });
  },
} as const;

export const SessionEvents = {
  async started(transaction: Prisma.TransactionClient, session: SessionEventOwner, clientTimestamp: string): Promise<void> {
    await SessionEventRecords.insert(transaction, session, {
      name: SessionEventName.Started,
      clientTimestamp,
      properties: {},
    });
  },

  async transition(transaction: Prisma.TransactionClient, session: SessionEventOwner, transition: SessionTransitionEvent): Promise<void> {
    const occurrence = {
      clientTimestamp: transition.clientTimestamp,
      stepIdentifier: transition.fromStepIdentifier,
    };

    if (transition.kind === SessionTransitionKind.Back) {
      await SessionEventRecords.insert(transaction, session, {
        ...occurrence,
        name: SessionEventName.BackClicked,
        properties: { destination_step_id: transition.toStepIdentifier },
      });

      return;
    }

    if (isUndefined(transition.answerKind)) {
      return;
    }

    await SessionEventRecords.insert(transaction, session, {
      ...occurrence,
      name: SessionEventName.AnswerSubmitted,
      properties: { answer_kind: transition.answerKind },
    });

    if (transition.kind === SessionTransitionKind.Forward) {
      await SessionEventRecords.insert(transaction, session, {
        ...occurrence,
        name: SessionEventName.StepCompleted,
        properties: { next_step_id: transition.toStepIdentifier },
      });
    }
  },
} as const;
