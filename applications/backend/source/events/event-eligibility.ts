import type { FunnelConfiguration, FunnelResult } from '@kelpie/contracts';
import { isEqual, isNull, isUndefined, isPlainObject } from 'es-toolkit/predicate';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import type { Prisma } from '../../generated/prisma/client.js';
import { SessionProjection } from '../sessions/session-projection.js';
import { SessionSnapshots } from '../sessions/session-snapshots.js';
import type { OwnedSession, SessionState } from '../sessions/session-types.js';
import { SessionPolicy } from '../sessions/session-policy.js';
import {
  EventIngestionPolicy,
  EventRejectionCode,
  ObservationName,
} from './event-ingestion-policy.js';
import type {
  ObservationEvent,
  ObservationProperties,
  ResultObservationName,
} from './event-ingestion-types.js';

const ResultObservationProperties = {
  [ObservationName.ResultViewed](result: FunnelResult): ObservationProperties {
    return { result_id: result.id };
  },

  [ObservationName.CtaClicked](result: FunnelResult): ObservationProperties {
    return { result_id: result.id, action: result.cta.action };
  },

  [ObservationName.RecommendationExpanded](result: FunnelResult): Optional<ObservationProperties> {
    if (result.cta.action !== EventIngestionPolicy.ExpansionAction) {
      return undefined;
    }

    return {
      result_id: result.id,
      action: result.cta.action,
      source: EventIngestionPolicy.ExpansionSource,
    };
  },
} as const satisfies ReadonlyDictionary<
  ResultObservationName,
  ValueMapper<FunnelResult, Optional<ObservationProperties>>
>;

const HistoricalObservations = {
  async state(
    transaction: Prisma.TransactionClient,
    session: OwnedSession,
    revision: number,
  ): Promise<Optional<SessionState>> {
    if (revision === 0) {
      return isNull(session.initialState) ? undefined : SessionSnapshots.read(session.initialState);
    }

    const transition = await transaction.sessionTransition.findUnique({
      where: { sessionIdentifier_revision: { sessionIdentifier: session.identifier, revision } },
      select: { operation: { select: { response: true } } },
    });

    return isNull(transition) ? undefined : SessionSnapshots.read(transition.operation.response);
  },

  properties(state: SessionState, event: ObservationEvent): Optional<ObservationProperties> {
    const confirmedAnswers = SessionProjection.confirmedAnswers(state, state.configuration);
    const evaluation = FunnelEvaluation.evaluate(
      state.configuration,
      state.variant,
      confirmedAnswers,
    );
    const stepIndex = evaluation.route.steps.findIndex((step) => step.id === event.step_id);
    const step = evaluation.route.steps[stepIndex];

    if (isUndefined(step) || state.currentStepIdentifier !== event.step_id) {
      return undefined;
    }

    if (event.name === ObservationName.StepViewed) {
      return {
        step_type: step.type,
        visible_step_index: stepIndex,
        visible_step_count: evaluation.route.steps.length,
      };
    }

    const result = state.result;

    if (isNull(result)) {
      return undefined;
    }

    return ResultObservationProperties[event.name](result);
  },
} as const;

const ObservationMetadata = {
  matches(session: OwnedSession, event: ObservationEvent): boolean {
    const acquisition = isPlainObject(session.acquisitionParameters)
      ? session.acquisitionParameters
      : {};
    const metadata = {
      session_id: session.identifier,
      funnel_id: session.version.funnelIdentifier,
      funnel_version: session.version.version,
      experiment_id: session.experimentIdentifier,
      variant: session.variant,
      ...acquisition,
    };
    const hasMetadataMismatch = Object.entries(metadata).some(
      ([fieldName, expectedValue]) =>
        Object.hasOwn(event, fieldName) && !isEqual(Reflect.get(event, fieldName), expectedValue),
    );
    const hasUndeclaredAcquisition = SessionPolicy.AcquisitionFields.some(
      (fieldName) => Object.hasOwn(event, fieldName) && !Object.hasOwn(acquisition, fieldName),
    );

    return !hasMetadataMismatch && !hasUndeclaredAcquisition;
  },

  declaresProperties(configuration: FunnelConfiguration, event: ObservationEvent): boolean {
    const declaration = configuration.events.allowed.find((allowed) => allowed.name === event.name);

    if (isUndefined(declaration)) {
      return false;
    }

    return isEqual([...declaration.properties].sort(), Object.keys(event.properties).sort());
  },

  matchesState(session: OwnedSession, state: SessionState, event: ObservationEvent): boolean {
    return (
      state.sessionIdentifier === session.identifier &&
      state.versionIdentifier === session.versionIdentifier &&
      state.variant === session.variant &&
      state.revision === event.observationRevision
    );
  },
} as const;

export const EventEligibility = {
  async rejection(
    database: Prisma.TransactionClient,
    session: OwnedSession,
    event: ObservationEvent,
  ): Promise<Optional<ValueOf<typeof EventRejectionCode>>> {
    if (!ObservationMetadata.matches(session, event)) {
      return EventRejectionCode.Metadata;
    }

    const configuration = SessionProjection.configuration(session);

    if (!ObservationMetadata.declaresProperties(configuration, event)) {
      return EventRejectionCode.Invalid;
    }

    const state = await HistoricalObservations.state(database, session, event.observationRevision);

    if (isUndefined(state) || !ObservationMetadata.matchesState(session, state, event)) {
      return EventRejectionCode.Ineligible;
    }

    if (!isEqual(HistoricalObservations.properties(state, event), event.properties)) {
      return EventRejectionCode.Ineligible;
    }

    return undefined;
  },
} as const;
