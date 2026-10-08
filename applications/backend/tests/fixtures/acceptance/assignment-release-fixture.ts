import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Ajv } from 'ajv';
import {
  EventBatchResponseSchema,
  type EventBatchResponse,
} from '../../../source/events/event-ingestion-types.js';
import type { BackendApplicationFixture } from '../backend-application.js';
import { PublicationHttpFixtures } from '../publication-http-fixtures.js';
import { PublicationFixtures } from '../publication-fixtures.js';
import {
  SessionFlowFixture,
  type SessionBrowserFixture,
  type SessionFlowState,
} from '../session-flow.js';
import { EventAcceptanceFixture } from '../event-acceptance.js';

const receiptValidator = new Ajv({ strict: true }).compile<EventBatchResponse>(
  EventBatchResponseSchema,
);

export const AssignmentReleaseFixture = {
  async publish(
    backend: BackendApplicationFixture,
    cookie: string,
    versionIdentifier: string,
    revision: number,
  ): Promise<void> {
    const response = await PublicationHttpFixtures.post(
      backend,
      'publications',
      cookie,
      PublicationFixtures.request('workstyle-planner', versionIdentifier, revision),
    );
    assert.equal(response.status, 201);
  },

  async rollback(backend: BackendApplicationFixture, cookie: string): Promise<void> {
    const response = await PublicationHttpFixtures.post(backend, 'rollbacks', cookie, {
      operationIdentifier: randomUUID(),
      funnelIdentifier: 'workstyle-planner',
      expectedRevision: 3,
    });
    assert.equal(response.status, 201);
  },

  async complete(
    browser: SessionBrowserFixture,
    initial: SessionFlowState,
    answers: readonly unknown[],
  ) {
    const command = SessionFlowFixture.command(initial);
    const continued = await SessionFlowFixture.state(
      await browser.post('/current/continue', command),
    );
    const result = await EventAcceptanceFixture.answerSequence(browser, continued, answers);
    assert.equal(result.currentStepIdentifier, 'result');
    assert.ok(result.result);

    return { command, continued, result };
  },

  async observeResult(
    backend: BackendApplicationFixture,
    browser: SessionBrowserFixture,
    state: SessionFlowState,
    expanded: boolean,
  ): Promise<void> {
    const viewed = EventAcceptanceFixture.result(state, 'result_viewed');
    const clicked = EventAcceptanceFixture.result(state, 'cta_clicked');
    const events = [viewed, clicked, EventAcceptanceFixture.result(state, 'result_viewed')];

    if (expanded) {
      events.push(EventAcceptanceFixture.result(state, 'recommendation_expanded'));
    }

    const first = await EventAcceptanceFixture.post(backend, browser, events);
    assert.equal(first.status, 200);
    const accepted: unknown = await first.json();
    assert.ok(receiptValidator(accepted));
    assert.deepEqual(
      accepted.receipts.map(({ position, event_id, status }) => ({ position, event_id, status })),
      events.map((event, position) => ({ position, event_id: event.event_id, status: 'accepted' })),
    );
    const replay = await EventAcceptanceFixture.post(backend, browser, events);
    assert.equal(replay.status, 200);
    assert.deepEqual(await replay.json(), {
      receipts: accepted.receipts.map((receipt) => ({ ...receipt, status: 'duplicate' })),
    });
  },
} as const;
