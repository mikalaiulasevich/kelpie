import { isNull } from 'es-toolkit/predicate';
import { HttpStatus } from '@nestjs/common';
import { AnswerValidation, FunnelEvaluation, RouteResolution } from '@kelpie/funnel-runtime';
import { DictionaryAccess, StepRules, StepType, type FunnelStep } from '@kelpie/contracts';
import type { EvaluatedFunnel } from '@kelpie/funnel-runtime';
import { PublicRequestError } from '../transport/public-request-error.js';
import { SessionTransitionKind } from '../events/session-event-policy.js';
import type { SessionTransitionEvent } from '../events/session-event-types.js';
import { SessionProjection } from './session-projection.js';
import type { OwnedSession } from './session-types.js';
import type { SessionCommand } from './session-command-types.js';
import { SessionCommandKind, SessionCommandErrorCode } from './session-command-policy.js';
import { SessionCommandMessages } from './session-command-messages.js';

export const SessionCommandRouting = {
  evaluate(record: OwnedSession): EvaluatedFunnel {
    const configuration = SessionProjection.configuration(record);

    return FunnelEvaluation.evaluate(
      configuration,
      SessionProjection.variant(record.variant),
      SessionProjection.confirmedAnswers(record, configuration),
    );
  },

  current(record: OwnedSession, evaluation: EvaluatedFunnel, command: SessionCommand): FunnelStep {
    const step = evaluation.route.steps.find(
      (candidate) => candidate.id === record.currentStepIdentifier,
    );
    if (!step || step.id !== command.stepIdentifier) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionCommandErrorCode.InvalidStep,
        SessionCommandMessages.InvalidStep,
      );
    }

    return step;
  },

  invalidatedAnswers(record: OwnedSession, evaluation: EvaluatedFunnel): ReadonlyList<string> {
    const available = new Map(evaluation.route.steps.map((step) => [step.id, step]));

    return record.answers
      .filter((answer) => {
        if (isNull(answer.confirmationRevision)) {
          return false;
        }

        const step = available.get(answer.stepIdentifier);

        return (
          !step ||
          !StepRules.isInteractive(step) ||
          !AnswerValidation.validate(step, answer.value).valid
        );
      })
      .map((answer) => answer.stepIdentifier);
  },

  firstBlocking(evaluation: EvaluatedFunnel): Optional<FunnelStep> {
    return evaluation.route.steps.find(
      (step) =>
        StepRules.isInteractive(step) &&
        step.validation.required &&
        !AnswerValidation.validate(
          step,
          DictionaryAccess.readOwn(evaluation.route.activeAnswers, step.input.name),
        ).valid,
    );
  },

  transition(
    record: OwnedSession,
    evaluation: EvaluatedFunnel,
    command: SessionCommand,
  ): SessionTransitionEvent {
    const current = SessionCommandRouting.current(record, evaluation, command);
    const direction =
      command.kind === SessionCommandKind.Back
        ? SessionTransitionKind.Back
        : SessionTransitionKind.Forward;
    const adjacent =
      direction === SessionTransitionKind.Back
        ? RouteResolution.previous(evaluation.route, current.id)
        : RouteResolution.next(evaluation.route, current.id);
    const unavailableResult =
      (current.type === StepType.Result || adjacent?.type === StepType.Result) &&
      !evaluation.result;
    const destination = unavailableResult
      ? SessionCommandRouting.firstBlocking(evaluation)
      : adjacent;
    if (!destination) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionCommandErrorCode.UnavailableNavigation,
        SessionCommandMessages.UnavailableNavigation,
      );
    }

    return {
      operationIdentifier: command.operationIdentifier,
      kind: unavailableResult ? SessionTransitionKind.RouteCorrection : direction,
      fromStepIdentifier: current.id,
      toStepIdentifier: destination.id,
      clientTimestamp: command.clientTimestamp,
      ...(command.kind === SessionCommandKind.Answer && StepRules.isInteractive(current)
        ? { answerKind: current.type }
        : {}),
    };
  },
} as const;
