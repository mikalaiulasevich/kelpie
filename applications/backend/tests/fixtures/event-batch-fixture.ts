import { randomUUID } from 'node:crypto';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import { SessionProjection } from '../../source/sessions/session-projection.js';
import { SessionSnapshots } from '../../source/sessions/session-snapshots.js';
import type { BackendApplicationFixture } from './backend-application.js';
import {
  SessionFlowFixture,
  type SessionBrowserFixture,
  type SessionFlowState,
} from './session-flow.js';

export const EventBatchFixture = {
  view(value: SessionFlowState) {
    const state = SessionSnapshots.read(value);
    const route = FunnelEvaluation.evaluate(
      state.configuration,
      state.variant,
      SessionProjection.confirmedAnswers(state, state.configuration),
    ).route;

    return {
      event_id: randomUUID(),
      session_id: state.sessionIdentifier,
      name: 'step_viewed',
      client_timestamp: '2026-10-07T12:00:00.000Z',
      step_id: state.currentStepIdentifier,
      observationRevision: state.revision,
      properties: {
        step_type: 'info',
        visible_step_index: 0,
        visible_step_count: route.steps.length,
      },
    };
  },

  post(
    backend: BackendApplicationFixture,
    browser: SessionBrowserFixture,
    events: readonly unknown[],
  ) {
    return backend.request('/api/events/batches', {
      method: 'POST',
      headers: { ...SessionFlowFixture.Headers, cookie: browser.cookie },
      body: JSON.stringify({ events }),
    });
  },
} as const;
