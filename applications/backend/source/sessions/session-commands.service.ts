import { isNull } from 'es-toolkit/predicate';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AnswerValidation } from '@kelpie/funnel-runtime';
import { StepRules, StepType, type FunnelStep } from '@kelpie/contracts';
import { Prisma, type SessionOperation } from '../../generated/prisma/client.js';
import { DatabaseErrors } from '../database/database-errors.js';
import { DatabaseService } from '../database/database.service.js';
import { PublicRequestError } from '../transport/public-request-error.js';
import type { SessionTransitionEvent } from '../events/session-event-types.js';
import { SessionEvents } from '../events/session-events.js';
import { SessionOwnershipService } from './session-ownership.service.js';
import { SessionRecords } from './session-records.js';
import { SessionProjection } from './session-projection.js';
import { SessionSnapshots } from './session-snapshots.js';
import type { OwnedSession, SessionState } from './session-types.js';
import { SessionCommandInputs } from './session-command-inputs.js';
import { SessionCommandRouting } from './session-command-routing.js';
import {
  SessionCommandKind,
  SessionCommandPolicy,
  SessionCommandErrorCode,
} from './session-command-policy.js';
import { SessionCommandMessages } from './session-command-messages.js';
import type { SessionCommand } from './session-command-types.js';

const SessionCommandChecks = {
  replay(operation: SessionOperation, fingerprint: string): SessionState {
    if (operation.requestFingerprint !== fingerprint) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionCommandErrorCode.Conflict,
        SessionCommandMessages.Conflict,
      );
    }

    return SessionSnapshots.read(operation.response);
  },
  revision(record: OwnedSession, command: SessionCommand): void {
    if (record.revision !== command.expectedSessionRevision) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionCommandErrorCode.StaleRevision,
        SessionCommandMessages.StaleRevision,
      );
    }
  },
  step(step: FunnelStep, command: SessionCommand): void {
    if (command.kind === SessionCommandKind.Back) {
      return;
    }

    if (command.kind === SessionCommandKind.Continue && step.type === StepType.Information) {
      return;
    }

    if (command.kind === SessionCommandKind.Answer && StepRules.isInteractive(step)) {
      const validation = AnswerValidation.validate(step, command.answer);
      if (validation.valid) {
        return;
      }

      throw new PublicRequestError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        SessionCommandErrorCode.InvalidAnswer,
        SessionCommandMessages.InvalidAnswer,
        validation.issues.map((issue) => ({
          path: SessionCommandPolicy.AnswerPath,
          message: issue.message,
        })),
      );
    }

    throw new PublicRequestError(
      HttpStatus.CONFLICT,
      SessionCommandErrorCode.InvalidStep,
      SessionCommandMessages.InvalidStep,
    );
  },
} as const;

@Injectable()
export class SessionCommandsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(SessionOwnershipService) private readonly ownership: SessionOwnershipService,
  ) {}

  submit(request: FastifyRequest, body: unknown): Promise<SessionState> {
    return this.execute(request, SessionCommandInputs.read(SessionCommandKind.Answer, body));
  }

  continue(request: FastifyRequest, body: unknown): Promise<SessionState> {
    return this.execute(request, SessionCommandInputs.read(SessionCommandKind.Continue, body));
  }

  back(request: FastifyRequest, body: unknown): Promise<SessionState> {
    return this.execute(request, SessionCommandInputs.read(SessionCommandKind.Back, body));
  }

  private async execute(request: FastifyRequest, command: SessionCommand): Promise<SessionState> {
    this.ownership.assertMutation(request);
    const fingerprint = SessionCommandInputs.fingerprint(command);
    const credentialHash = await this.ownership.requireCredential(request);
    try {
      return await this.database.client.$transaction(async (transaction) => {
        const record = await SessionRecords.requireOwned(transaction, credentialHash);
        const operation = await this.findOperation(
          transaction,
          record.identifier,
          command.operationIdentifier,
        );
        if (operation) {
          return SessionCommandChecks.replay(operation, fingerprint);
        }

        return this.apply(transaction, record, credentialHash, command, fingerprint);
      });
    } catch (error) {
      if (!DatabaseErrors.isUniqueConstraint(error)) {
        throw error;
      }

      return this.database.client.$transaction(async (transaction) => {
        const record = await SessionRecords.requireOwned(transaction, credentialHash);
        const winner = await this.findOperation(
          transaction,
          record.identifier,
          command.operationIdentifier,
        );
        if (!winner) {
          throw error;
        }

        return SessionCommandChecks.replay(winner, fingerprint);
      });
    }
  }

  private findOperation(
    transaction: Prisma.TransactionClient,
    sessionIdentifier: string,
    operationIdentifier: string,
  ) {
    return transaction.sessionOperation.findUnique({
      where: { sessionIdentifier_operationIdentifier: { sessionIdentifier, operationIdentifier } },
    });
  }

  private async apply(
    transaction: Prisma.TransactionClient,
    record: OwnedSession,
    credentialHash: string,
    command: SessionCommand,
    fingerprint: string,
  ): Promise<SessionState> {
    SessionCommandChecks.revision(record, command);
    const initial = SessionCommandRouting.evaluate(record);
    const current = SessionCommandRouting.current(record, initial, command);
    SessionCommandChecks.step(current, command);
    const revision = record.revision + 1;
    const transition = await this.prepareTransition(
      transaction,
      record,
      credentialHash,
      command,
      revision,
    );
    await this.advance(transaction, record, transition, revision);
    const changed = await SessionRecords.requireOwned(transaction, credentialHash);

    return this.persist(transaction, changed, transition, fingerprint);
  }

  private async prepareTransition(
    transaction: Prisma.TransactionClient,
    record: OwnedSession,
    credentialHash: string,
    command: SessionCommand,
    revision: number,
  ): Promise<SessionTransitionEvent> {
    await this.storeAnswer(transaction, record, command, revision);
    const answered = await SessionRecords.requireOwned(transaction, credentialHash);
    const evaluation = SessionCommandRouting.evaluate(answered);
    const invalidated = SessionCommandRouting.invalidatedAnswers(answered, evaluation);
    if (invalidated.length > 0) {
      await transaction.sessionAnswer.updateMany({
        where: { sessionIdentifier: record.identifier, stepIdentifier: { in: [...invalidated] } },
        data: { confirmationRevision: null },
      });
    }

    return SessionCommandRouting.transition(answered, evaluation, command);
  }

  private async advance(
    transaction: Prisma.TransactionClient,
    record: OwnedSession,
    transition: SessionTransitionEvent,
    revision: number,
  ): Promise<void> {
    const updated = await transaction.session.updateMany({
      where: { identifier: record.identifier, revision: record.revision },
      data: { revision, currentStepIdentifier: transition.toStepIdentifier },
    });
    if (updated.count !== 1) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionCommandErrorCode.StaleRevision,
        SessionCommandMessages.StaleRevision,
      );
    }
  }

  private async persist(
    transaction: Prisma.TransactionClient,
    changed: OwnedSession,
    transition: SessionTransitionEvent,
    fingerprint: string,
  ): Promise<SessionState> {
    const response = SessionProjection.read(changed);
    await transaction.sessionOperation.create({
      data: {
        sessionIdentifier: changed.identifier,
        operationIdentifier: transition.operationIdentifier,
        requestFingerprint: fingerprint,
        response: SessionSnapshots.json(response),
      },
    });
    await transaction.sessionTransition.create({
      data: {
        sessionIdentifier: changed.identifier,
        operationIdentifier: transition.operationIdentifier,
        revision: changed.revision,
        kind: transition.kind,
        fromStepIdentifier: transition.fromStepIdentifier,
        toStepIdentifier: transition.toStepIdentifier,
      },
    });
    await SessionEvents.transition(transaction, changed, transition);

    return response;
  }

  private async storeAnswer(
    transaction: Prisma.TransactionClient,
    record: OwnedSession,
    command: SessionCommand,
    revision: number,
  ): Promise<void> {
    if (command.kind !== SessionCommandKind.Answer) {
      return;
    }

    const value = isNull(command.answer) ? Prisma.JsonNull : command.answer;
    await transaction.sessionAnswer.upsert({
      where: {
        sessionIdentifier_stepIdentifier: {
          sessionIdentifier: record.identifier,
          stepIdentifier: command.stepIdentifier,
        },
      },
      create: {
        sessionIdentifier: record.identifier,
        stepIdentifier: command.stepIdentifier,
        value,
        confirmationRevision: revision,
      },
      update: { value, confirmationRevision: revision },
    });
  }
}
