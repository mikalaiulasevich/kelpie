import { isNull } from 'es-toolkit/predicate';
import { HttpStatus } from '@nestjs/common';
import { AnswerValidation, FunnelEvaluation, RouteResolution } from '@kelpie/funnel-runtime';
import {
  DictionaryAccess,
  StepRules,
  StepType,
  type FunnelConfiguration,
  type FunnelStep,
} from '@kelpie/contracts';
import type { EvaluatedFunnel } from '@kelpie/funnel-runtime';
import { PublicRequestError } from '../transport/public-request-error.js';
import { SessionTransitionKind } from '../events/session-event-policy.js';
import type { SessionTransitionEvent } from '../events/session-event-types.js';
import { SessionProjection } from './session-projection.js';
import type { OwnedSession } from './session-types.js';
import type { SessionCommand } from './session-command-types.js';
import { SessionCommandKind, SessionCommandErrorCode } from './session-command-policy.js';
import { SessionCommandMessages } from './session-command-messages.js';

interface NavigationDestination {
  readonly step: Optional<FunnelStep>;
  readonly kind: SessionTransitionKind;
}

const SessionNavigation = {
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

  requested(
    evaluation: EvaluatedFunnel,
    current: FunnelStep,
    command: SessionCommand,
  ): NavigationDestination {
    if (command.kind === SessionCommandKind.Back) {
      return {
        step: RouteResolution.previous(evaluation.route, current.id),
        kind: SessionTransitionKind.Back,
      };
    }

    return {
      step: RouteResolution.next(evaluation.route, current.id),
      kind: SessionTransitionKind.Forward,
    };
  },

  resolve(
    evaluation: EvaluatedFunnel,
    current: FunnelStep,
    command: SessionCommand,
  ): NavigationDestination {
    const requested = SessionNavigation.requested(evaluation, current, command);
    const requiresResult =
      current.type === StepType.Result || requested.step?.type === StepType.Result;
    if (requiresResult && !evaluation.result) {
      return {
        step: SessionNavigation.firstBlocking(evaluation),
        kind: SessionTransitionKind.RouteCorrection,
      };
    }

    return requested;
  },
} as const;

export const SessionCommandRouting = {
  evaluate(record: OwnedSession, configuration: FunnelConfiguration): EvaluatedFunnel {
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

  transition(
    record: OwnedSession,
    evaluation: EvaluatedFunnel,
    command: SessionCommand,
  ): SessionTransitionEvent {
    const current = SessionCommandRouting.current(record, evaluation, command);
    const destination = SessionNavigation.resolve(evaluation, current, command);
    if (!destination.step) {
      throw new PublicRequestError(
        HttpStatus.CONFLICT,
        SessionCommandErrorCode.UnavailableNavigation,
        SessionCommandMessages.UnavailableNavigation,
      );
    }

    const occurrence = {
      operationIdentifier: command.operationIdentifier,
      kind: destination.kind,
      fromStepIdentifier: current.id,
      toStepIdentifier: destination.step.id,
      clientTimestamp: command.clientTimestamp,
    };

    if (command.kind === SessionCommandKind.Answer && StepRules.isInteractive(current)) {
      return { ...occurrence, answerKind: current.type };
    }

    return occurrence;
  },
} as const;
