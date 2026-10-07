import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import { AdministrationService } from '../../source/administration/administration.service.js';
import { SessionProjection } from '../../source/sessions/session-projection.js';
import { SessionSnapshots } from '../../source/sessions/session-snapshots.js';
import { AdministrationFixture } from './administration.js';
import { AnalyticsFixture } from './analytics-fixture.js';
import type { BackendApplicationFixture } from './backend-application.js';
import {
  SessionFlowFixture,
  type SessionBrowserFixture,
  type SessionFlowState,
} from './session-flow.js';

const EventAcceptanceStatements = {
  RejectSecond: `CREATE TEMP TRIGGER reject_second_observation BEFORE INSERT ON Event
    WHEN NEW.source = 'client' AND (SELECT COUNT(*) FROM Event WHERE source = 'client') >= 1
    BEGIN SELECT RAISE(ABORT, 'forced_observation_failure'); END`,
  Restore: 'DROP TRIGGER IF EXISTS reject_second_observation',
} as const;

export const EventAcceptanceFixture = {
  async administratorCookie(backend: BackendApplicationFixture): Promise<string> {
    const { username, password } = AdministrationFixture.Credentials;
    await backend.getService(AdministrationService).provision(username, password);
    const response = await AdministrationFixture.signIn(backend);
    assert.equal(response.status, 200);

    return AdministrationFixture.cookie(response);
  },

  async analytics(
    backend: BackendApplicationFixture,
    cookie: string,
    query: ReadonlyDictionary<string, string>,
  ) {
    const response = await backend.request(
      `/api/administration/analytics?${new URLSearchParams(query)}`,
      { headers: { cookie } },
    );
    assert.equal(response.status, 200);

    return AnalyticsFixture.response(response);
  },

  post(
    backend: BackendApplicationFixture,
    browser: SessionBrowserFixture,
    events: readonly unknown[],
  ): Promise<Response> {
    return backend.request('/api/events/batches', {
      method: 'POST',
      headers: { ...SessionFlowFixture.Headers, cookie: browser.cookie },
      body: JSON.stringify({ events }),
    });
  },

  event(
    state: SessionFlowState,
    eventName: string,
    properties: ReadonlyDictionary<string, TextOrNumber>,
  ) {
    return {
      event_id: randomUUID(),
      session_id: state.sessionIdentifier,
      name: eventName,
      client_timestamp: SessionFlowFixture.Timestamp,
      step_id: state.currentStepIdentifier,
      observationRevision: state.revision,
      properties,
    };
  },

  view(state: SessionFlowState) {
    const snapshot = SessionSnapshots.read(state);
    const answers = SessionProjection.confirmedAnswers(snapshot, snapshot.configuration);
    const evaluation = FunnelEvaluation.evaluate(snapshot.configuration, snapshot.variant, answers);
    const visibleStepIndex = evaluation.route.steps.findIndex(
      (step) => step.id === snapshot.currentStepIdentifier,
    );
    const step = evaluation.route.steps[visibleStepIndex];
    assert.ok(step);

    return EventAcceptanceFixture.event(state, 'step_viewed', {
      step_type: step.type,
      visible_step_index: visibleStepIndex,
      visible_step_count: evaluation.route.steps.length,
    });
  },

  result(state: SessionFlowState, eventName: string) {
    const snapshot = SessionSnapshots.read(state);
    assert.ok(snapshot.result);
    const properties: Record<string, TextOrNumber> = { result_id: snapshot.result.id };

    if (eventName !== 'result_viewed') {
      properties['action'] = snapshot.result.cta.action;
    }

    if (eventName === 'recommendation_expanded') {
      properties['source'] = 'primary_cta';
    }

    return EventAcceptanceFixture.event(state, eventName, properties);
  },

  async answerSequence(
    browser: SessionBrowserFixture,
    initialState: SessionFlowState,
    answers: readonly unknown[],
  ): Promise<SessionFlowState> {
    let state = initialState;

    for (const answer of answers) {
      state = await browser.answer(state, answer);
    }

    return state;
  },

  async rejectSecond(backend: BackendApplicationFixture): Promise<void> {
    await backend.database.$executeRawUnsafe(EventAcceptanceStatements.RejectSecond);
  },

  async restore(backend: BackendApplicationFixture): Promise<void> {
    await backend.database.$executeRawUnsafe(EventAcceptanceStatements.Restore);
  },
} as const;
