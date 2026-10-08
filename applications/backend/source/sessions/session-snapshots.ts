import { Ajv } from 'ajv';
import {
  isEqual,
  isNull,
  isPlainObject,
  isString,
  isBoolean,
  isUndefined,
} from 'es-toolkit/predicate';
import { FunnelConfigurations, type FunnelConfiguration } from '@kelpie/contracts';
import { SessionProjection } from './session-projection.js';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import type { Prisma } from '../../generated/prisma/client.js';
import { SessionSchemas, type SessionState, type OwnedSession } from './session-types.js';
import type { Static } from 'typebox';
import { SessionMessages } from './session-messages.js';
import { SessionReplaySchemas, type HistoricalSessionState } from './session-replay-types.js';
import { SessionReplayPolicy } from './session-replay-policy.js';
import { omit } from 'es-toolkit/object';
import { ConfigurationImportDocument } from '../configurations/configuration-import-document.js';

const SessionSnapshotValidators = {
  compact: new Ajv({ strict: true }).compile<Static<typeof SessionReplaySchemas.Compact>>(
    SessionReplaySchemas.Compact,
  ),
  state: new Ajv({ strict: true }).compile<Static<typeof SessionSchemas.State>>(
    SessionSchemas.State,
  ),
} as const;

const SnapshotJson = {
  value(value: unknown): Prisma.InputJsonValue | null {
    if (isNull(value) || isString(value) || isBoolean(value)) {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(SnapshotJson.value);
    }

    if (isPlainObject(value)) {
      return SnapshotJson.object(value);
    }

    throw new Error(SessionMessages.Corrupted);
  },

  object(value: object): Prisma.InputJsonObject {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, SnapshotJson.value(child)]),
    );
  },
} as const;

const HistoricalSessionProjection = {
  restore(
    state: HistoricalSessionState,
    configuration: FunnelConfiguration,
    owner?: OwnedSession,
  ): SessionState {
    if (
      !isUndefined(owner) &&
      (state.sessionIdentifier !== owner.identifier ||
        state.versionIdentifier !== owner.versionIdentifier ||
        state.funnelIdentifier !== owner.version.funnelIdentifier ||
        state.funnelVersion !== owner.version.version ||
        state.variant !== owner.variant ||
        state.revision < 0 ||
        state.revision > owner.revision)
    ) {
      throw new Error(SessionMessages.Corrupted);
    }

    const confirmedAnswers = SessionProjection.confirmedAnswers(state, configuration);
    const evaluation = FunnelEvaluation.evaluate(configuration, state.variant, confirmedAnswers);
    const result = SessionProjection.result(evaluation, state.currentStepIdentifier);

    if (
      !evaluation.route.steps.some((step) => step.id === state.currentStepIdentifier) ||
      !isEqual(state.progress, {
        completed: evaluation.route.completedQuestionCount,
        total: evaluation.route.questionCount,
      }) ||
      state.answers.some(
        (answer) =>
          !isNull(answer.confirmationRevision) &&
          (answer.confirmationRevision < 0 || answer.confirmationRevision > state.revision),
      )
    ) {
      throw new Error(SessionMessages.Corrupted);
    }

    return { ...state, configuration, result };
  },
} as const;

export const SessionSnapshots = {
  json(state: SessionState): Prisma.InputJsonObject {
    const historicalState = omit(state, ['configuration', 'result']);

    return SnapshotJson.object({ format: SessionReplayPolicy.Format, state: historicalState });
  },

  isCompact(value: unknown): boolean {
    return SessionSnapshotValidators.compact(value);
  },

  read(value: unknown, owner?: OwnedSession): SessionState {
    if (SessionSnapshotValidators.compact(value)) {
      if (isUndefined(owner)) {
        throw new Error(SessionMessages.Corrupted);
      }

      const prepared = ConfigurationImportDocument.prepare(owner.version.document);

      if (!ConfigurationImportDocument.matchesVersion(owner.version, prepared)) {
        throw new Error(SessionMessages.Corrupted);
      }

      return HistoricalSessionProjection.restore(value.state, prepared.configuration, owner);
    }

    if (!SessionSnapshotValidators.state(value)) {
      throw new Error(SessionMessages.Corrupted);
    }

    const validation = FunnelConfigurations.validate(value.configuration);

    if (!validation.valid) {
      throw new Error(SessionMessages.Corrupted);
    }

    const configuration = validation.configuration;

    if (!isUndefined(owner) && !isEqual(configuration, SessionProjection.configuration(owner))) {
      throw new Error(SessionMessages.Corrupted);
    }

    const restored = HistoricalSessionProjection.restore(value, configuration, owner);

    if (!isEqual(restored.result, value.result)) {
      throw new Error(SessionMessages.Corrupted);
    }

    return restored;
  },
} as const;
