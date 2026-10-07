import {
  ExperimentVariant,
  FunnelConfigurations,
  StepType,
  StepRules,
  type SessionAnswers,
  type FunnelConfiguration,
  type StepAnswer,
} from '@kelpie/contracts';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import { isNull, isString } from 'es-toolkit/predicate';
import { SessionMessages } from './session-messages.js';
import type { OwnedSession, SessionState } from './session-types.js';

export const SessionProjection = {
  configuration(record: OwnedSession): FunnelConfiguration {
    const result = FunnelConfigurations.validate(record.version.document);
    if (!result.valid) {
      throw new Error(SessionMessages.Corrupted);
    }

    return result.configuration;
  },

  variant(value: string): ExperimentVariant {
    if (value === ExperimentVariant.A || value === ExperimentVariant.B) {
      return value;
    }

    throw new Error(SessionMessages.Corrupted);
  },

  answer(value: unknown): StepAnswer | null {
    if (isNull(value)) {
      return null;
    }
    if (isString(value) || (typeof value === 'number' && Number.isFinite(value))) {
      return value;
    }
    if (Array.isArray(value) && value.every(isString)) {
      return value;
    }

    throw new Error(SessionMessages.Corrupted);
  },

  confirmedAnswers(record: OwnedSession, configuration: FunnelConfiguration): SessionAnswers {
    const answers: Record<string, StepAnswer> = {};
    for (const answer of record.answers) {
      const step = configuration.steps[answer.stepIdentifier];
      if (
        isNull(answer.confirmationRevision) ||
        isNull(answer.value) ||
        !step ||
        !StepRules.isInteractive(step)
      ) {
        continue;
      }
      const value = SessionProjection.answer(answer.value);
      if (!isNull(value)) {
        Object.defineProperty(answers, step.input.name, { value, enumerable: true });
      }
    }

    return answers;
  },

  read(record: OwnedSession): SessionState {
    const configuration = SessionProjection.configuration(record);
    const variant = SessionProjection.variant(record.variant);
    const answers = record.answers.map((answer) => ({
      stepIdentifier: answer.stepIdentifier,
      value: SessionProjection.answer(answer.value),
      confirmationRevision: answer.confirmationRevision,
    }));
    const confirmed = SessionProjection.confirmedAnswers(record, configuration);
    const evaluation = FunnelEvaluation.evaluate(configuration, variant, confirmed);
    const current = evaluation.route.steps.find((step) => step.id === record.currentStepIdentifier);

    return {
      sessionIdentifier: record.identifier,
      revision: record.revision,
      versionIdentifier: record.versionIdentifier,
      funnelIdentifier: record.version.funnelIdentifier,
      funnelVersion: record.version.version,
      variant,
      configuration,
      currentStepIdentifier: record.currentStepIdentifier,
      answers,
      progress: {
        completed: evaluation.route.completedQuestionCount,
        total: evaluation.route.questionCount,
      },
      result: current?.type === StepType.Result ? (evaluation.result ?? null) : null,
    };
  },
} as const;
