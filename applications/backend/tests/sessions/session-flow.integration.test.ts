import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { PublicationFixtures } from '../fixtures/publication-fixtures.js';
import { SessionFlowCases } from '../cases/session-flow-cases.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';

describe('session HTTP acceptance', () => {
  let backend: BackendApplicationFixture;
  let publication: Awaited<ReturnType<typeof SessionFlowFixture.prepare>>;
  let browser: SessionBrowserFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
    publication = await SessionFlowFixture.prepare(backend);
    browser = new SessionBrowserFixture(backend);
  });

  afterEach(async () => {
    await backend?.close();
  });

  it('bootstraps ownership without creating sessions or analytical starts', async () => {
    const first = await browser.current();
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ state: null, expired: false });
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(first.headers.get('set-cookie')).toContain('HttpOnly');
    expect(first.headers.get('set-cookie')).toContain('SameSite=Strict');
    expect(first.headers.get('set-cookie')).toContain('Path=/api');
    const acknowledgedCookie = browser.cookie;

    expect(await (await browser.current()).json()).toEqual({ state: null, expired: false });
    expect(browser.cookie).toBe(acknowledgedCookie);
    const lostHandshake = new SessionBrowserFixture(backend);
    expect(await (await lostHandshake.current()).json()).toEqual({ state: null, expired: false });
    expect(await backend.database.session.count()).toBe(0);
    expect(await backend.database.event.count()).toBe(0);
  });

  it('requires acknowledged ownership and CSRF evidence before creating a session', async () => {
    expect((await browser.post('', SessionFlowFixture.creation())).status).toBe(401);
    await browser.current();
    const rejected = await backend.request('/api/sessions', {
      method: 'POST',
      headers: { cookie: browser.cookie, 'content-type': 'application/json' },
      body: JSON.stringify(SessionFlowFixture.creation()),
    });
    expect(rejected.status).toBe(403);
    expect(await backend.database.session.count()).toBe(0);
    expect(await backend.database.event.count()).toBe(0);
  });

  it('deduplicates simultaneous creation and rejects changed intent under its identifier', async () => {
    await browser.current();
    const creation = SessionFlowFixture.creation();
    const responses = await Promise.all([
      browser.post('?variant=B', creation),
      browser.post('?variant=B', creation),
    ]);
    const states = await Promise.all(responses.map(SessionFlowFixture.state));
    expect(states[0]).toEqual(states[1]);
    expect(await backend.database.session.count()).toBe(1);
    expect(await backend.database.event.count()).toBe(1);
    expect(await backend.database.sessionOperation.count()).toBe(1);

    const changed = await browser.post('?variant=A', creation);
    expect(changed.status).toBe(409);
    expect(await changed.json()).toMatchObject({ code: 'operation_conflict' });
    expect(await backend.database.session.count()).toBe(1);
  });

  it('rejects a tampered bootstrap cookie instead of binding an attacker-selected credential', async () => {
    await browser.current();
    const cookie = browser.cookie;
    const lastCharacter = cookie.at(-1);
    browser.cookie = `${cookie.slice(0, -1)}${lastCharacter === 'A' ? 'B' : 'A'}`;

    expect((await browser.post('', SessionFlowFixture.creation())).status).toBe(401);
    expect(await backend.database.session.count()).toBe(0);
    expect(await backend.database.event.count()).toBe(0);
    expect(await (await browser.current()).json()).toEqual({ state: null, expired: false });
    expect(browser.cookie).not.toBe(cookie);
  });

  it('replays a lost creation response and retains its version and assignment through publish and rollback', async () => {
    await browser.current();
    const creation = SessionFlowFixture.creation();
    const original = await SessionFlowFixture.state(
      await browser.post('?variant=A&utm_campaign=original', creation),
    );
    await publication.service.publish(
      PublicationFixtures.request(
        publication.first.funnelIdentifier,
        publication.third.identifier,
        1,
      ),
      publication.administrator.identifier,
    );

    expect(
      await SessionFlowFixture.state(
        await browser.post('?variant=A&utm_campaign=original', creation),
      ),
    ).toEqual(original);
    expect(await (await browser.current()).json()).toEqual({ state: original, expired: false });
    const newBrowser = new SessionBrowserFixture(backend);
    const newest = await newBrowser.create('B');
    expect(newest).toMatchObject({ funnelVersion: 3, variant: 'B' });

    await publication.service.rollback(
      {
        operationIdentifier: SessionFlowFixture.creation().operationIdentifier,
        funnelIdentifier: publication.first.funnelIdentifier,
        expectedRevision: 2,
      },
      publication.administrator.identifier,
    );
    expect(await (await newBrowser.current()).json()).toEqual({ state: newest, expired: false });
    const restored = await new SessionBrowserFixture(backend).create('A');
    expect(restored.funnelVersion).toBe(1);
    expect(await backend.database.event.count({ where: { name: 'session_started' } })).toBe(3);
    const record = await backend.database.session.findUniqueOrThrow({
      where: { identifier: original.sessionIdentifier },
    });
    expect(record).toMatchObject({
      variant: 'A',
      assignmentSource: 'forced',
      campaign: 'original',
    });
    expect(record.accessTokenHash).not.toBe(browser.cookie);
  });

  it('authenticates ownership and expiration before replaying sensitive command results', async () => {
    const initial = await browser.create();
    const operation = SessionFlowFixture.command(initial);
    const completed = await SessionFlowFixture.state(
      await browser.post('/current/continue', operation),
    );
    const stranger = new SessionBrowserFixture(backend);
    await stranger.current();
    expect((await stranger.post('/current/continue', operation)).status).toBe(401);

    expect(
      await SessionFlowFixture.state(await browser.post('/current/continue', operation)),
    ).toEqual(completed);
    await backend.database.session.update({
      where: { identifier: initial.sessionIdentifier },
      data: { expiresAt: new Date(0) },
    });
    expect((await browser.post('/current/continue', operation)).status).toBe(401);
    const oldCookie = browser.cookie;
    expect(await (await browser.current()).json()).toEqual({ state: null, expired: true });
    expect(browser.cookie).not.toBe(oldCookie);
    expect(await backend.database.session.count()).toBe(1);
    expect(
      await backend.database.sessionOperation.count({
        where: { sessionIdentifier: initial.sessionIdentifier },
      }),
    ).toBe(2);
  });

  it.each(SessionFlowCases.Complete)(
    'completes $name with authoritative private events',
    async ({ variant, answers, expectedResultIdentifier, expectedTotal }) => {
      const initial = await browser.create(variant);
      let state = await browser.continue(initial);

      for (const submission of answers) {
        expect(state.currentStepIdentifier).toBe(submission.stepIdentifier);
        expect(state.result).toBeNull();
        state = await browser.answer(state, submission.answer);
      }

      expect(state.currentStepIdentifier).toBe('result');
      expect(state.result).toMatchObject({ id: expectedResultIdentifier });
      expect(state.progress).toEqual({ completed: expectedTotal, total: expectedTotal });
      expect(state.revision).toBe(answers.length + 1);
      expect(await (await browser.current()).json()).toEqual({ state, expired: false });
      const events = await backend.database.event.findMany({
        where: { sessionIdentifier: state.sessionIdentifier },
      });
      expect(events.filter((event) => event.name === 'session_started')).toHaveLength(1);
      expect(events.filter((event) => event.name === 'answer_submitted')).toHaveLength(
        answers.length,
      );
      expect(events.filter((event) => event.name === 'step_completed')).toHaveLength(
        answers.length,
      );
      expect(
        events.some((event) => event.stepIdentifier === 'intro' && event.name === 'step_completed'),
      ).toBe(false);
      expect(
        events.some((event) =>
          ['step_viewed', 'result_viewed', 'cta_clicked'].includes(event.name),
        ),
      ).toBe(false);
      for (const event of events) {
        expect(event.source).toBe('server');
        expect(event.properties).not.toHaveProperty('answer');
        expect(event.properties).not.toHaveProperty('value');
        if (event.name === 'answer_submitted') {
          expect(Object.keys(event.properties ?? {})).toEqual(['answer_kind']);
        }
      }

      expect(
        await backend.database.sessionTransition.count({
          where: { sessionIdentifier: state.sessionIdentifier },
        }),
      ).toBe(answers.length + 1);
    },
  );

  it('retains hidden branch values without confirming them again until explicit submission', async () => {
    let state = await browser.continue(await browser.create('A'));
    state = await browser.answer(state, 10);
    state = await browser.answer(state, 'hybrid');
    state = await browser.answer(state, ['focus']);
    state = await browser.answer(state, 'same');
    state = await browser.answer(state, 2);
    expect(state.currentStepIdentifier).toBe('async_maturity');

    for (let remaining = 4; remaining > 0; remaining -= 1) {
      state = await browser.back(state);
    }

    expect(state.currentStepIdentifier).toBe('work_mode');
    state = await browser.answer(state, 'remote');
    expect(state.answers).toContainEqual({
      stepIdentifier: 'office_days',
      value: 2,
      confirmationRevision: null,
    });
    expect(state.progress.total).toBe(6);
    expect(await (await browser.current()).json()).toEqual({ state, expired: false });

    state = await browser.back(state);
    state = await browser.answer(state, 'hybrid');
    state = await browser.answer(state, ['focus']);
    state = await browser.answer(state, 'same');
    expect(state.currentStepIdentifier).toBe('office_days');
    expect(state.answers).toContainEqual({
      stepIdentifier: 'office_days',
      value: 2,
      confirmationRevision: null,
    });
    expect(state.result).toBeNull();
    state = await browser.answer(state, 2);
    expect(state.answers).toContainEqual({
      stepIdentifier: 'office_days',
      value: 2,
      confirmationRevision: state.revision,
    });
  });
});
