import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { EventAcceptanceFixture } from '../fixtures/event-acceptance.js';
import { EventAcceptanceCases } from '../cases/event-acceptance-cases.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { PublicationFixtures } from '../fixtures/publication-fixtures.js';

describe('event ingestion independent HTTP acceptance', () => {
  let backend: BackendApplicationFixture;
  let browser: SessionBrowserFixture;
  let publication: Awaited<ReturnType<typeof SessionFlowFixture.prepare>>;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
    publication = await SessionFlowFixture.prepare(backend);
    browser = new SessionBrowserFixture(backend);
  });

  afterEach(async () => {
    await backend?.close();
  });

  it('accepts a delayed observation from a committed branch even after it becomes hidden', async () => {
    const office = await EventAcceptanceFixture.answerSequence(
      browser,
      await browser.continue(await browser.create()),
      EventAcceptanceCases.HybridPrefix,
    );
    expect(office.currentStepIdentifier).toBe('office_days');
    const delayed = EventAcceptanceFixture.view(office);
    let changed = await browser.back(await browser.back(await browser.back(office)));
    expect(changed.currentStepIdentifier).toBe('work_mode');
    changed = await browser.answer(changed, 'remote');
    const nonexistentRevision = {
      ...delayed,
      event_id: SessionFlowFixture.creation().operationIdentifier,
      observationRevision: changed.revision + 1,
    };
    const hiddenNow = {
      ...delayed,
      event_id: SessionFlowFixture.creation().operationIdentifier,
      observationRevision: changed.revision,
    };
    const response = await EventAcceptanceFixture.post(backend, browser, [
      delayed,
      hiddenNow,
      nonexistentRevision,
    ]);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({
      receipts: [
        { position: 0, event_id: delayed.event_id, status: 'accepted' },
        { position: 1, event_id: hiddenNow.event_id, status: 'rejected' },
        { position: 2, event_id: nonexistentRevision.event_id, status: 'rejected' },
      ],
    });
    expect(await backend.database.event.count({ where: { source: 'client' } })).toBe(1);
  });

  it('accepts CTA before result viewing arrives and keeps the first receipt timestamp on replay', async () => {
    const state = await EventAcceptanceFixture.answerSequence(
      browser,
      await browser.continue(await browser.create()),
      EventAcceptanceCases.RemoteCompletion,
    );
    const click = EventAcceptanceFixture.result(state, 'cta_clicked');
    const viewed = EventAcceptanceFixture.result(state, 'result_viewed');
    const response = await EventAcceptanceFixture.post(backend, browser, [click, viewed]);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      receipts: [{ status: 'accepted' }, { status: 'accepted' }],
    });
    const before = await backend.database.event.findMany({
      where: { source: 'client' },
      orderBy: { identifier: 'asc' },
    });
    const replay = await EventAcceptanceFixture.post(backend, browser, [viewed, click]);
    expect(await replay.json()).toMatchObject({
      receipts: [
        { event_id: viewed.event_id, status: 'duplicate' },
        { event_id: click.event_id, status: 'duplicate' },
      ],
    });
    expect(
      await backend.database.event.findMany({
        where: { source: 'client' },
        orderBy: { identifier: 'asc' },
      }),
    ).toEqual(before);
  });

  it('does not disclose an existing event when its identifier is reused by a different owner', async () => {
    const original = EventAcceptanceFixture.view(await browser.create());
    const first = await EventAcceptanceFixture.post(backend, browser, [original]);
    expect(first.status).toBe(200);
    const stranger = new SessionBrowserFixture(backend);
    const other = EventAcceptanceFixture.view(await stranger.create());
    const collision = { ...other, event_id: original.event_id };
    const response = await EventAcceptanceFixture.post(backend, stranger, [original, collision]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      receipts: [
        {
          position: 0,
          event_id: original.event_id,
          status: 'rejected',
          code: 'event_metadata_mismatch',
        },
        {
          position: 1,
          event_id: original.event_id,
          status: 'rejected',
          code: 'event_identifier_conflict',
        },
      ],
    });
    expect(await backend.database.event.count({ where: { source: 'client' } })).toBe(1);
  });

  it.each(EventAcceptanceCases.Spoofed)(
    'rejects $name independently of a valid neighbor',
    async ({ overrides }) => {
      const valid = EventAcceptanceFixture.view(await browser.create());
      const forged = {
        ...valid,
        ...overrides,
        event_id: SessionFlowFixture.creation().operationIdentifier,
      };
      const response = await EventAcceptanceFixture.post(backend, browser, [forged, valid]);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        receipts: [
          { position: 0, event_id: forged.event_id, status: 'rejected' },
          { position: 1, event_id: valid.event_id, status: 'accepted' },
        ],
      });
      expect(await backend.database.event.count({ where: { source: 'client' } })).toBe(1);
    },
  );

  it('keeps v3-only action eligibility after rollback without granting it to a new v1 session', async () => {
    await publication.service.publish(
      PublicationFixtures.request(
        publication.first.funnelIdentifier,
        publication.third.identifier,
        1,
      ),
      publication.administrator.identifier,
    );
    const state = await EventAcceptanceFixture.answerSequence(
      browser,
      await browser.continue(await browser.create('B')),
      EventAcceptanceCases.ThirdVersionCompletion,
    );
    expect(state.currentStepIdentifier).toBe('result');
    await publication.service.rollback(
      {
        operationIdentifier: SessionFlowFixture.creation().operationIdentifier,
        funnelIdentifier: publication.first.funnelIdentifier,
        expectedRevision: 2,
      },
      publication.administrator.identifier,
    );
    const expanded = EventAcceptanceFixture.result(state, 'recommendation_expanded');
    const accepted = await EventAcceptanceFixture.post(backend, browser, [expanded]);
    expect(await accepted.json()).toMatchObject({ receipts: [{ status: 'accepted' }] });
    const restoredBrowser = new SessionBrowserFixture(backend);
    const restored = await EventAcceptanceFixture.answerSequence(
      restoredBrowser,
      await restoredBrowser.continue(await restoredBrowser.create()),
      EventAcceptanceCases.RemoteCompletion,
    );
    expect(restored.funnelVersion).toBe(1);
    const unsupported = EventAcceptanceFixture.result(restored, 'recommendation_expanded');
    const rejected = await EventAcceptanceFixture.post(backend, restoredBrowser, [unsupported]);
    expect(await rejected.json()).toMatchObject({ receipts: [{ status: 'rejected' }] });
    expect(await backend.database.event.count({ where: { name: 'recommendation_expanded' } })).toBe(
      1,
    );
  });

  it('aggregates the real command and observation flow once across shuffled and repeated batches', async () => {
    const initial = await browser.create('A');
    const question = await browser.continue(initial);
    const result = await EventAcceptanceFixture.answerSequence(
      browser,
      question,
      EventAcceptanceCases.RemoteCompletion,
    );
    const click = EventAcceptanceFixture.result(result, 'cta_clicked');
    const viewed = EventAcceptanceFixture.result(result, 'result_viewed');
    const intro = EventAcceptanceFixture.view(initial);
    const teamSize = EventAcceptanceFixture.view(question);
    const events = [click, viewed, viewed, intro, teamSize, intro];
    const first = await EventAcceptanceFixture.post(backend, browser, events);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({
      receipts: [
        { status: 'accepted' },
        { status: 'accepted' },
        { status: 'duplicate' },
        { status: 'accepted' },
        { status: 'accepted' },
        { status: 'duplicate' },
      ],
    });
    const repeated = await EventAcceptanceFixture.post(backend, browser, events);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toMatchObject({
      receipts: events.map(() => ({ status: 'duplicate' })),
    });
    const cookie = await EventAcceptanceFixture.administratorCookie(backend);
    const query = {
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: initial.versionIdentifier,
      campaign: 'acceptance',
    };
    const included = await EventAcceptanceFixture.analytics(backend, cookie, {
      ...query,
      includeForced: 'true',
    });
    const variant = included.versions[0]?.variants[0];
    expect(variant).toMatchObject({
      variant: 'A',
      started: 1,
      resultCompletion: { numerator: 1, denominator: 1, value: 1 },
      ctaConversion: { numerator: 1, denominator: 1, value: 1 },
      ctaClickThrough: { numerator: 1, denominator: 1, value: 1 },
    });
    expect(variant?.steps.find((step) => step.stepIdentifier === 'intro')).toMatchObject({
      reached: 1,
      completed: 1,
      completion: { numerator: 1, denominator: 1, value: 1 },
    });
    expect(variant?.edges.find((edge) => edge.fromStepIdentifier === 'intro')).toMatchObject({
      fromStepIdentifier: 'intro',
      toStepIdentifier: 'team_size',
      transitions: 1,
      observedConversion: { numerator: 1, denominator: 1, value: 1 },
    });
    const excluded = await EventAcceptanceFixture.analytics(backend, cookie, query);
    expect(excluded.versions[0]?.variants[0]).toMatchObject({
      started: 0,
      resultCompletion: { numerator: 0, denominator: 0, value: null },
    });
    const anotherCampaign = await EventAcceptanceFixture.analytics(backend, cookie, {
      ...query,
      campaign: 'unrelated',
      includeForced: 'true',
    });
    expect(anotherCampaign.versions[0]?.variants[0]?.started).toBe(0);
  });

  it('retains the first committed batch element after a later database failure and safely retries the batch', async () => {
    const state = await browser.create();
    const events = [EventAcceptanceFixture.view(state), EventAcceptanceFixture.view(state)];
    await EventAcceptanceFixture.rejectSecond(backend);
    const failed = await EventAcceptanceFixture.post(backend, browser, events);
    expect(failed.status).toBeGreaterThanOrEqual(500);
    const committed = await backend.database.event.findMany({ where: { source: 'client' } });
    expect(committed).toHaveLength(1);
    expect(committed[0]?.identifier).toBe(events[0]?.event_id);
    await EventAcceptanceFixture.restore(backend);
    const response = await EventAcceptanceFixture.post(backend, browser, events);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      receipts: [{ status: 'duplicate' }, { status: 'accepted' }],
    });
    expect(await backend.database.event.count({ where: { source: 'client' } })).toBe(2);
  });
});
