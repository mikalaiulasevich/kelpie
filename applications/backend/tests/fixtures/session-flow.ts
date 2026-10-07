import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Ajv } from 'ajv';
import type { Static } from 'typebox';
import { SessionSchemas } from '../../source/sessions/session-types.js';
import type { BackendApplicationFixture } from './backend-application.js';
import { PublicationFixtures } from './publication-fixtures.js';

export type SessionFlowState = Static<typeof SessionSchemas.State>;

const stateValidator = new Ajv({ strict: true }).compile<SessionFlowState>(SessionSchemas.State);

export const SessionFlowFixture = {
  Headers: {
    origin: 'http://127.0.0.1:5173',
    'x-kelpie-session': '1',
    'content-type': 'application/json',
  },
  Timestamp: '2026-10-07T12:00:00.000Z',

  async prepare(backend: BackendApplicationFixture) {
    const publication = await PublicationFixtures.prepare(backend);
    await publication.service.publish(
      PublicationFixtures.request(publication.first.funnelIdentifier, publication.first.identifier),
      publication.administrator.identifier,
    );

    return publication;
  },

  creation() {
    return {
      operationIdentifier: randomUUID(),
      funnelIdentifier: 'workstyle-planner',
      clientTimestamp: SessionFlowFixture.Timestamp,
    };
  },

  command(state: SessionFlowState) {
    return {
      operationIdentifier: randomUUID(),
      expectedSessionRevision: state.revision,
      stepIdentifier: state.currentStepIdentifier,
      clientTimestamp: SessionFlowFixture.Timestamp,
    };
  },

  async state(response: Response): Promise<SessionFlowState> {
    const value: unknown = await response.json();
    assert.ok(response.ok, JSON.stringify(value));
    assert.ok(stateValidator(value), JSON.stringify(stateValidator.errors));

    return value;
  },
} as const;

export class SessionBrowserFixture {
  cookie = '';

  constructor(private readonly backend: BackendApplicationFixture) {}

  async current(): Promise<Response> {
    const response = await this.backend.request('/api/sessions/current', {
      headers: { cookie: this.cookie },
    });
    const cookie = response.headers.get('set-cookie')?.split(';')[0];
    if (cookie) {
      this.cookie = cookie;
    }

    return response;
  }

  post(path: string, body: unknown): Promise<Response> {
    return this.backend.request(`/api/sessions${path}`, {
      method: 'POST',
      headers: { ...SessionFlowFixture.Headers, cookie: this.cookie },
      body: JSON.stringify(body),
    });
  }

  async create(variant: 'A' | 'B' = 'A'): Promise<SessionFlowState> {
    await this.current();

    return SessionFlowFixture.state(await this.post(
      `?variant=${variant}&utm_campaign=acceptance&utm_source=fixture`,
      SessionFlowFixture.creation(),
    ));
  }

  async continue(state: SessionFlowState): Promise<SessionFlowState> {
    return SessionFlowFixture.state(await this.post('/current/continue', SessionFlowFixture.command(state)));
  }

  async answer(state: SessionFlowState, answer: unknown): Promise<SessionFlowState> {
    return SessionFlowFixture.state(await this.post('/current/answers', {
      ...SessionFlowFixture.command(state),
      answer,
    }));
  }

  async back(state: SessionFlowState): Promise<SessionFlowState> {
    return SessionFlowFixture.state(await this.post('/current/back', SessionFlowFixture.command(state)));
  }
}
