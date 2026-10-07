import { Ajv } from 'ajv';
import { isEqual, isNull, isPlainObject, isString, isBoolean } from 'es-toolkit/predicate';
import { FunnelConfigurations } from '@kelpie/contracts';
import { SessionProjection } from './session-projection.js';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import type { Prisma } from '../../generated/prisma/client.js';
import { SessionSchemas, type SessionState } from './session-types.js';
import type { Static } from 'typebox';
import { SessionMessages } from './session-messages.js';

const SessionSnapshotValidators = {
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

export const SessionSnapshots = {
  json(state: SessionState): Prisma.InputJsonObject {
    return SnapshotJson.object(state);
  },

  read(value: unknown): SessionState {
    if (!SessionSnapshotValidators.state(value)) {
      throw new Error(SessionMessages.Corrupted);
    }

    const validation = FunnelConfigurations.validate(value.configuration);

    if (!validation.valid) {
      throw new Error(SessionMessages.Corrupted);
    }

    const configuration = validation.configuration;
    const confirmedAnswers = SessionProjection.confirmedAnswers(value, configuration);
    const evaluation = FunnelEvaluation.evaluate(configuration, value.variant, confirmedAnswers);
    const result = SessionProjection.result(evaluation, value.currentStepIdentifier);

    if (!isEqual(result, value.result)) {
      throw new Error(SessionMessages.Corrupted);
    }

    return { ...value, configuration, result };
  },
} as const;
