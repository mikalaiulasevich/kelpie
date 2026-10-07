import { isEqual, isNull, isUndefined } from 'es-toolkit/predicate';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import type { Prisma } from '../../generated/prisma/client.js';
import { SessionProjection } from '../sessions/session-projection.js';
import { SessionSnapshots } from '../sessions/session-snapshots.js';
import type { OwnedSession, SessionState } from '../sessions/session-types.js';
import { EventIngestionPolicy, EventRejectionCode, ObservationName } from './event-ingestion-policy.js';
import type { ObservationEvent } from './event-ingestion-types.js';

const HistoricalObservations = {
  async state(transaction: Prisma.TransactionClient, session: OwnedSession, revision: number): Promise<Optional<SessionState>> {
    if (revision === 0) {
      return isNull(session.initialState) ? undefined : SessionSnapshots.read(session.initialState);
    }

    const transition = await transaction.sessionTransition.findUnique({
      where: { sessionIdentifier_revision: { sessionIdentifier: session.identifier, revision } },
      select: { operation: { select: { response: true } } },
    });

    return isNull(transition) ? undefined : SessionSnapshots.read(transition.operation.response);
  },

  properties(state: SessionState, event: ObservationEvent): Optional<Readonly<Record<string, TextOrNumber>>> {
    const confirmed = SessionProjection.confirmedAnswers(state, state.configuration);
    const evaluation = FunnelEvaluation.evaluate(state.configuration, state.variant, confirmed);
    const index = evaluation.route.steps.findIndex((step) => step.id === event.step_id);
    const step = evaluation.route.steps[index];
    if (isUndefined(step) || state.currentStepIdentifier !== event.step_id) {
      return undefined;
    }

    if (event.name === ObservationName.StepViewed) {
      return { step_type: step.type, visible_step_index: index, visible_step_count: evaluation.route.steps.length };
    }

    const result = state.result;
    if (isNull(result)) {
      return undefined;
    }

    if (event.name === ObservationName.ResultViewed) {
      return { result_id: result.id };
    }

    if (event.name === ObservationName.CtaClicked) {
      return { result_id: result.id, action: result.cta.action };
    }

    if (result.cta.action !== EventIngestionPolicy.ExpansionAction) {
      return undefined;
    }

    return { result_id: result.id, action: result.cta.action, source: EventIngestionPolicy.ExpansionSource };
  },
} as const;

export const EventEligibility = {
  async rejection(transaction: Prisma.TransactionClient, session: OwnedSession, event: ObservationEvent): Promise<Optional<ValueOf<typeof EventRejectionCode>>> {
    const configuration = SessionProjection.configuration(session);
    const metadata = {
      session_id: session.identifier,
      funnel_id: configuration.funnelId,
      funnel_version: configuration.version,
      experiment_id: session.experimentIdentifier,
      variant: session.variant,
      ...Object(session.acquisitionParameters),
    };
    if (Object.entries(metadata).some(([key, value]) => Object.hasOwn(event, key) && !isEqual(Reflect.get(event, key), value))) {
      return EventRejectionCode.Metadata;
    }

    const acquisition = session.acquisitionParameters;
    if (['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].some((key) => Object.hasOwn(event, key) && (!acquisition || !Object.hasOwn(acquisition, key)))) {
      return EventRejectionCode.Metadata;
    }

    const declaration = configuration.events.allowed.find((allowed) => allowed.name === event.name);
    if (isUndefined(declaration) || !isEqual([...declaration.properties].sort(), Object.keys(event.properties).sort())) {
      return EventRejectionCode.Invalid;
    }

    const state = await HistoricalObservations.state(transaction, session, event.observationRevision);
    if (isUndefined(state) || state.sessionIdentifier !== session.identifier || state.versionIdentifier !== session.versionIdentifier || state.variant !== session.variant || state.revision !== event.observationRevision) {
      return EventRejectionCode.Ineligible;
    }

    if (!isEqual(HistoricalObservations.properties(state, event), event.properties)) {
      return EventRejectionCode.Ineligible;
    }

    return undefined;
  },
} as const;
