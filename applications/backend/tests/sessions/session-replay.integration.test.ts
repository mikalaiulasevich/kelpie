import { PublicationService } from '../../source/publications/publication.service.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { SessionSnapshots } from '../../source/sessions/session-snapshots.js';
import { SessionPolicy } from '../../source/sessions/session-policy.js';
import { PublicationFixtures } from '../fixtures/publication-fixtures.js';
import { EventAcceptanceFixture } from '../fixtures/event-acceptance.js';

describe('compact and legacy historical session replay', () => {
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

  it('replays exact historical answers after later answers, publication and rollback', async () => {
    const initial = await browser.create();
    const numeric = await browser.continue(initial);
    const command = { ...SessionFlowFixture.command(numeric), answer: 10 };
    const historical = await SessionFlowFixture.state(
      await browser.post('/current/answers', command),
    );
    const backed = await browser.back(historical);
    await browser.answer(backed, 25);
    const administrator = await backend.database.administrator.findFirstOrThrow();
    const latest = await backend.database.funnelVersion.findFirstOrThrow({ where: { version: 3 } });
    const publication = backend.getService(PublicationService);
    await publication.publish(
      PublicationFixtures.request('workstyle-planner', latest.identifier, 1),
      administrator.identifier,
    );
    await publication.publish(
      PublicationFixtures.request('workstyle-planner', initial.versionIdentifier, 2),
      administrator.identifier,
    );

    expect(await SessionFlowFixture.state(await browser.post('/current/answers', command))).toEqual(
      historical,
    );
    const operation = await backend.database.sessionOperation.findFirstOrThrow({
      where: { operationIdentifier: command.operationIdentifier },
    });
    expect(operation.response).toMatchObject({
      format: 'kelpie-session-replay-v1',
      state: { revision: 2 },
    });
    expect(JSON.stringify(operation.response)).not.toContain('configuration');
    expect(JSON.stringify(operation.response).length).toBeLessThan(
      JSON.stringify(historical).length / 4,
    );

    await backend.database.sessionOperation.update({
      where: {
        sessionIdentifier_operationIdentifier: {
          sessionIdentifier: operation.sessionIdentifier,
          operationIdentifier: operation.operationIdentifier,
        },
      },
      data: { response: JSON.parse(JSON.stringify(historical)) },
    });
    expect(await SessionFlowFixture.state(await browser.post('/current/answers', command))).toEqual(
      historical,
    );
    const storedInitial = await backend.database.session.findUniqueOrThrow({
      where: { identifier: initial.sessionIdentifier },
    });
    expect(SessionSnapshots.isCompact(storedInitial.initialState)).toBe(true);
  });

  it('accepts delayed historical observations for compact and legacy creation states', async () => {
    const initial = await browser.create();
    await browser.continue(initial);
    const compactView = EventAcceptanceFixture.view(initial);
    expect(
      await (await EventAcceptanceFixture.post(backend, browser, [compactView])).json(),
    ).toMatchObject({ receipts: [{ status: 'accepted' }] });
    await backend.database.session.update({
      where: { identifier: initial.sessionIdentifier },
      data: { initialState: JSON.parse(JSON.stringify(initial)) },
    });
    const legacyView = EventAcceptanceFixture.view(initial);
    const response = await EventAcceptanceFixture.post(backend, browser, [legacyView]);
    expect(response.status).toBe(200);
    expect(
      await backend.database.event.count({
        where: { identifier: { in: [compactView.event_id, legacyView.event_id] } },
      }),
    ).toBe(2);
  });

  it('rejects malformed, foreign and future compact snapshots before replay', async () => {
    const initial = await browser.create();
    const owner = await backend.database.session.findUniqueOrThrow({
      where: { identifier: initial.sessionIdentifier },
      include: SessionPolicy.RecordInclude,
    });
    const full = SessionSnapshots.read(initial);
    const compact = SessionSnapshots.json(full);
    expect(() => SessionSnapshots.read(compact)).toThrow();
    expect(() =>
      SessionSnapshots.read({ format: 'kelpie-session-replay-v1', state: {} }, owner),
    ).toThrow();
    expect(() =>
      SessionSnapshots.read(
        SessionSnapshots.json({ ...full, sessionIdentifier: 'foreign' }),
        owner,
      ),
    ).toThrow();
    expect(() =>
      SessionSnapshots.read(
        SessionSnapshots.json({ ...full, versionIdentifier: 'foreign' }),
        owner,
      ),
    ).toThrow();
    expect(() =>
      SessionSnapshots.read(SessionSnapshots.json({ ...full, revision: 99 }), owner),
    ).toThrow();
    expect(() =>
      SessionSnapshots.read(
        SessionSnapshots.json({ ...full, progress: { completed: 99, total: 99 } }),
        owner,
      ),
    ).toThrow();
  });
});
