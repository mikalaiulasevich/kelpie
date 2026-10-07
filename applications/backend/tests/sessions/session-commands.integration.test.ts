import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { SessionCommandFixtures } from '../fixtures/session-command-fixtures.js';

describe('atomic session commands with real SQLite', () => {
  let backend: BackendApplicationFixture;
  let browser: SessionBrowserFixture;
  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
    await SessionFlowFixture.prepare(backend);
    browser = new SessionBrowserFixture(backend);
  });
  afterEach(async () => {
    await backend?.close();
  });

  it('deduplicates simultaneous answer retries including state, transition and events', async () => {
    const state = await browser.continue(await browser.create());
    const command = { ...SessionFlowFixture.command(state), answer: 10 };
    const responses = await Promise.all([
      browser.post('/current/answers', command),
      browser.post('/current/answers', command),
    ]);
    const [first, second] = await Promise.all(responses.map(SessionFlowFixture.state));
    expect(second).toEqual(first);
    expect(first?.revision).toBe(2);
    expect(await backend.database.sessionTransition.count()).toBe(2);
    expect(await backend.database.event.count({ where: { name: 'answer_submitted' } })).toBe(1);
    expect(await backend.database.event.count({ where: { name: 'step_completed' } })).toBe(1);
    expect(await backend.database.sessionAnswer.count()).toBe(1);
  });

  it('rejects changed content on a simultaneous reused operation identifier', async () => {
    const state = await browser.continue(await browser.create());
    const command = SessionFlowFixture.command(state);
    const responses = await Promise.all([
      browser.post('/current/answers', { ...command, answer: 10 }),
      browser.post('/current/answers', { ...command, answer: 11 }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const rejected = responses.find((response) => response.status === 409);
    expect(await rejected?.json()).toMatchObject({ code: 'operation_conflict' });
    expect(await backend.database.sessionAnswer.count()).toBe(1);
    expect(await backend.database.event.count({ where: { name: 'answer_submitted' } })).toBe(1);
  });

  it('rolls back raw answers, revision, operation and transition when an event insert fails', async () => {
    const state = await browser.continue(await browser.create());
    const command = { ...SessionFlowFixture.command(state), answer: 10 };
    const before = await backend.database.session.findUniqueOrThrow({
      where: { identifier: state.sessionIdentifier },
    });
    const operations = await backend.database.sessionOperation.count();
    await SessionCommandFixtures.rejectEvents(backend);
    try {
      const response = await browser.post('/current/answers', command);
      expect(response.status).toBe(500);
      expect(
        await backend.database.session.findUniqueOrThrow({
          where: { identifier: state.sessionIdentifier },
        }),
      ).toEqual(before);
      expect(await backend.database.sessionOperation.count()).toBe(operations);
      expect(await backend.database.sessionTransition.count()).toBe(1);
      expect(await backend.database.sessionAnswer.count()).toBe(0);
      expect(await backend.database.event.count()).toBe(1);
    } finally {
      await SessionCommandFixtures.restoreEvents(backend);
    }

    expect((await browser.post('/current/answers', command)).status).toBe(200);
  });

  it('authenticates ownership and expiry before replaying a stored sensitive result', async () => {
    const initial = await browser.create();
    const command = SessionFlowFixture.command(initial);
    const accepted = await SessionFlowFixture.state(
      await browser.post('/current/continue', command),
    );
    expect(accepted.revision).toBe(1);
    const stranger = new SessionBrowserFixture(backend);
    await stranger.current();
    expect((await stranger.post('/current/continue', command)).status).toBe(401);
    await backend.database.session.update({
      where: { identifier: initial.sessionIdentifier },
      data: { expiresAt: new Date(0) },
    });
    expect((await browser.post('/current/continue', command)).status).toBe(401);
    expect(await backend.database.sessionTransition.count()).toBe(1);
  });
  it('maps confirmed answers by input name when it differs from the step identifier', async () => {
    await SessionCommandFixtures.publishOptionalNumeric(backend);
    const state = await browser.continue(await browser.create());
    const answered = await browser.answer(state, 10);
    expect(answered.answers).toEqual([
      { stepIdentifier: 'team_size', value: 10, confirmationRevision: 2 },
    ]);
    expect(answered.progress.completed).toBe(1);
    expect(await (await browser.current()).json()).toMatchObject({
      state: { progress: { completed: 1 } },
    });
  });

  it('retains an explicitly submitted optional null without activating a raw answer', async () => {
    await SessionCommandFixtures.publishOptionalNumeric(backend);
    const state = await browser.continue(await browser.create());
    const command = { ...SessionFlowFixture.command(state), answer: null };
    const answered = await SessionFlowFixture.state(
      await browser.post('/current/answers', command),
    );
    expect(answered.answers).toEqual([
      { stepIdentifier: 'team_size', value: null, confirmationRevision: 2 },
    ]);
    expect(answered.progress.completed).toBe(0);
    expect(await SessionFlowFixture.state(await browser.post('/current/answers', command))).toEqual(
      answered,
    );
    expect(await backend.database.sessionAnswer.findFirstOrThrow()).toMatchObject({
      value: null,
      confirmationRevision: 2,
    });
  });

  it('leaves state and analytics untouched on invalid answers or stale revisions', async () => {
    const state = await browser.continue(await browser.create());
    const command = SessionFlowFixture.command(state);
    const invalid = await browser.post('/current/answers', { ...command, answer: -1 });
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({ code: 'invalid_answer' });
    const stale = await browser.post('/current/answers', {
      ...command,
      expectedSessionRevision: 0,
      answer: 10,
    });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ code: 'stale_revision' });
    expect(await backend.database.sessionAnswer.count()).toBe(0);
    expect(await backend.database.sessionTransition.count()).toBe(1);
    expect(await backend.database.event.count()).toBe(1);
    expect(
      await backend.database.session.findUniqueOrThrow({
        where: { identifier: state.sessionIdentifier },
      }),
    ).toMatchObject({ revision: 1, currentStepIdentifier: 'team_size' });
  });
});
