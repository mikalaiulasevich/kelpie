import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { ConfigurationImportFixtures } from '../fixtures/configuration-import-fixtures.js';
import { PublicationHttpFixtures } from '../fixtures/publication-http-fixtures.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { EventAcceptanceFixture } from '../fixtures/event-acceptance.js';
import { AssignmentReleaseFixture } from '../fixtures/acceptance/assignment-release-fixture.js';
import { AssignmentReleaseCases } from '../cases/assignment-release-cases.js';

describe('assignment release compatibility through real HTTP', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await AdministrationFixture.create();
  });

  afterEach(async () => {
    await backend?.close();
  });

  it('pins participants across v1, v2, v3 and rollback while preserving replay and unique-session analytics', async () => {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));

    for (const version of AssignmentReleaseCases.Versions) {
      const imported = await PublicationHttpFixtures.post(
        backend,
        'configurations',
        cookie,
        ConfigurationImportFixtures.original(version),
      );
      expect(imported.status).toBe(201);
    }

    const first = await backend.database.funnelVersion.findFirstOrThrow({ where: { version: 1 } });
    const second = await backend.database.funnelVersion.findFirstOrThrow({ where: { version: 2 } });
    const third = await backend.database.funnelVersion.findFirstOrThrow({ where: { version: 3 } });
    await AssignmentReleaseFixture.publish(backend, cookie, first.identifier, 0);
    const firstBrowser = new SessionBrowserFixture(backend);
    const firstInitial = await firstBrowser.create('A');
    await AssignmentReleaseFixture.publish(backend, cookie, second.identifier, 1);
    const secondBrowser = new SessionBrowserFixture(backend);
    const secondInitial = await secondBrowser.create('B');
    await AssignmentReleaseFixture.publish(backend, cookie, third.identifier, 2);
    const thirdBrowser = new SessionBrowserFixture(backend);
    const thirdInitial = await thirdBrowser.create('B');
    await AssignmentReleaseFixture.rollback(backend, cookie);
    const rollbackBrowser = new SessionBrowserFixture(backend);
    const rollbackInitial = await rollbackBrowser.create('B');
    expect(firstInitial).toMatchObject({
      funnelVersion: 1,
      versionIdentifier: first.identifier,
      variant: 'A',
    });
    expect(secondInitial).toMatchObject({
      funnelVersion: 2,
      versionIdentifier: second.identifier,
      variant: 'B',
    });
    expect(thirdInitial).toMatchObject({
      funnelVersion: 3,
      versionIdentifier: third.identifier,
      variant: 'B',
    });
    expect(rollbackInitial).toMatchObject({
      funnelVersion: 2,
      versionIdentifier: second.identifier,
      variant: 'B',
    });

    const participants = [
      {
        browser: firstBrowser,
        initial: firstInitial,
        answers: AssignmentReleaseCases.FirstVersionAnswers,
      },
      {
        browser: secondBrowser,
        initial: secondInitial,
        answers: AssignmentReleaseCases.SecondVersionAnswers,
      },
      {
        browser: thirdBrowser,
        initial: thirdInitial,
        answers: AssignmentReleaseCases.ThirdVersionAnswers,
      },
      {
        browser: rollbackBrowser,
        initial: rollbackInitial,
        answers: AssignmentReleaseCases.SecondVersionAnswers,
      },
    ];

    for (const participant of participants) {
      expect(await (await participant.browser.current()).json()).toEqual({
        state: participant.initial,
        expired: false,
      });
      const completion = await AssignmentReleaseFixture.complete(
        participant.browser,
        participant.initial,
        participant.answers,
      );
      expect(completion.result).toMatchObject({
        versionIdentifier: participant.initial.versionIdentifier,
        funnelVersion: participant.initial.funnelVersion,
        variant: participant.initial.variant,
        configuration: participant.initial.configuration,
      });
      expect(
        await SessionFlowFixture.state(
          await participant.browser.post('/current/continue', completion.command),
        ),
      ).toEqual(completion.continued);
      expect(await (await participant.browser.current()).json()).toEqual({
        state: completion.result,
        expired: false,
      });
      await AssignmentReleaseFixture.observeResult(
        backend,
        participant.browser,
        completion.result,
        participant.initial.funnelVersion === 3,
      );

      if (participant.initial.funnelVersion !== 3) {
        const unsupported = await EventAcceptanceFixture.post(backend, participant.browser, [
          EventAcceptanceFixture.result(completion.result, 'recommendation_expanded'),
        ]);
        expect(await unsupported.json()).toMatchObject({ receipts: [{ status: 'rejected' }] });
      }
    }

    for (const version of [first, second, third]) {
      const analytics = await EventAcceptanceFixture.analytics(backend, cookie, {
        funnelIdentifier: 'workstyle-planner',
        versionIdentifier: version.identifier,
        includeForced: 'true',
        campaign: 'acceptance',
      });
      expect(analytics.versions).toHaveLength(1);
      const report = analytics.versions[0];
      const expectedVariant = version.version === 1 ? 'A' : 'B';
      const expectedCount = version.version === 2 ? 2 : 1;
      expect(report).toMatchObject({
        versionIdentifier: version.identifier,
        funnelVersion: version.version,
      });
      expect(report?.variants.find((variant) => variant.variant === expectedVariant)).toMatchObject(
        {
          started: expectedCount,
          resultCompletion: { numerator: expectedCount, denominator: expectedCount, value: 1 },
          ctaConversion: { numerator: expectedCount, denominator: expectedCount, value: 1 },
        },
      );
      expect(report?.variants.find((variant) => variant.variant !== expectedVariant)?.started).toBe(
        0,
      );
    }

    expect(await backend.database.event.count({ where: { name: 'result_viewed' } })).toBe(8);
    expect(
      await backend.database.event.count({
        where: {
          name: 'recommendation_expanded',
          sessionIdentifier: thirdInitial.sessionIdentifier,
        },
      }),
    ).toBe(1);
    expect(await backend.database.publication.count()).toBe(4);
  });
});
