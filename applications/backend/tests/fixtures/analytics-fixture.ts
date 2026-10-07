import { randomUUID } from 'node:crypto';
import { Ajv } from 'ajv';
import type { BackendApplicationFixture } from './backend-application.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';
import {
  AnalyticsResponseSchema,
  type AnalyticsResponse,
} from '../../source/analytics/analytics-response.js';

interface AnalyticsSessionScenario {
  readonly name: string;
  readonly versionIdentifier: string;
  readonly variant?: string;
  readonly expired?: boolean;
  readonly assignmentSource?: string;
  readonly trafficOrigin?: string;
  readonly campaign?: string;
  readonly started?: boolean;
}

const validator = new Ajv({ strict: true }).compile<AnalyticsResponse>(AnalyticsResponseSchema);

export const AnalyticsFixture = {
  async prepare(backend: BackendApplicationFixture) {
    const first = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(1),
    );
    const third = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(3),
    );
    const firstVersion = first.version.identifier;
    const complete = await AnalyticsFixture.session(backend, {
      name: 'complete',
      versionIdentifier: firstVersion,
    });
    const expired = await AnalyticsFixture.session(backend, {
      name: 'expired',
      versionIdentifier: firstVersion,
      expired: true,
    });
    const pending = await AnalyticsFixture.session(backend, {
      name: 'pending',
      versionIdentifier: firstVersion,
    });
    const abandoned = await AnalyticsFixture.session(backend, {
      name: 'abandoned',
      versionIdentifier: firstVersion,
      expired: true,
    });
    const unobserved = await AnalyticsFixture.session(backend, {
      name: 'unobserved',
      versionIdentifier: firstVersion,
    });

    await AnalyticsFixture.views(backend, complete, [
      'result',
      'office_days',
      'timezone_span',
      'intro',
      'team_size',
      'work_mode',
      'intro',
      'work_mode',
    ]);
    await AnalyticsFixture.views(backend, expired, ['intro', 'team_size', 'work_mode']);
    await AnalyticsFixture.views(backend, pending, ['intro', 'team_size']);
    await AnalyticsFixture.views(backend, abandoned, ['intro']);
    await AnalyticsFixture.views(backend, unobserved, ['team_size']);
    await AnalyticsFixture.transition(backend, complete, 'intro', 'team_size');
    await AnalyticsFixture.transition(backend, complete, 'team_size', 'work_mode');
    await AnalyticsFixture.transition(backend, complete, 'work_mode', 'timezone_span');
    await AnalyticsFixture.transition(backend, complete, 'timezone_span', 'work_mode', 'back');
    await AnalyticsFixture.transition(backend, complete, 'work_mode', 'office_days');
    await AnalyticsFixture.transition(backend, complete, 'work_mode', 'office_days');
    await AnalyticsFixture.transition(backend, expired, 'intro', 'team_size');
    await AnalyticsFixture.transition(backend, expired, 'team_size', 'work_mode');
    await AnalyticsFixture.transition(backend, expired, 'work_mode', 'timezone_span');
    await AnalyticsFixture.transition(backend, unobserved, 'intro', 'team_size');
    await AnalyticsFixture.event(backend, complete, 'cta_clicked', 'result');
    await AnalyticsFixture.event(backend, complete, 'result_viewed', 'result');
    await AnalyticsFixture.event(backend, complete, 'result_viewed', 'result');
    await AnalyticsFixture.event(backend, expired, 'cta_clicked', 'result');
    await AnalyticsFixture.session(backend, {
      name: 'forced',
      versionIdentifier: firstVersion,
      assignmentSource: 'forced',
    });
    await AnalyticsFixture.session(backend, {
      name: 'synthetic',
      versionIdentifier: firstVersion,
      trafficOrigin: 'synthetic',
    });
    await AnalyticsFixture.session(backend, {
      name: 'other-campaign',
      versionIdentifier: firstVersion,
      campaign: 'other',
      variant: 'B',
    });
    await AnalyticsFixture.session(backend, {
      name: 'third',
      versionIdentifier: third.version.identifier,
      variant: 'B',
    });
    const orphan = await AnalyticsFixture.session(backend, {
      name: 'without-start',
      versionIdentifier: firstVersion,
      started: false,
    });
    await AnalyticsFixture.views(backend, orphan, ['intro']);

    return { firstVersion, thirdVersion: third.version.identifier };
  },

  async session(
    backend: BackendApplicationFixture,
    scenario: AnalyticsSessionScenario,
  ): Promise<string> {
    const session = await backend.database.session.create({
      data: {
        identifier: scenario.name,
        versionIdentifier: scenario.versionIdentifier,
        experimentIdentifier: 'fixture-experiment',
        variant: scenario.variant ?? 'A',
        assignmentSource: scenario.assignmentSource ?? 'random',
        trafficOrigin: scenario.trafficOrigin ?? 'production',
        campaign: scenario.campaign ?? 'launch',
        acquisitionParameters: { utm_campaign: scenario.campaign ?? 'launch' },
        currentStepIdentifier: 'intro',
        expiresAt: new Date(
          scenario.expired ? '2020-01-01T00:00:00.000Z' : '2099-01-01T00:00:00.000Z',
        ),
      },
    });
    if (scenario.started !== false) {
      await AnalyticsFixture.event(backend, session.identifier, 'session_started', null, 'server');
    }

    return session.identifier;
  },

  async event(
    backend: BackendApplicationFixture,
    sessionIdentifier: string,
    name: string,
    stepIdentifier: string | null,
    source = 'client',
  ): Promise<void> {
    await backend.database.event.create({
      data: {
        identifier: randomUUID(),
        contentFingerprint: randomUUID(),
        sessionIdentifier,
        name,
        stepIdentifier,
        source,
        clientTimestamp: new Date('2026-01-01T00:00:00.000Z'),
        properties: {},
      },
    });
  },

  async views(
    backend: BackendApplicationFixture,
    sessionIdentifier: string,
    steps: readonly string[],
  ): Promise<void> {
    for (const step of steps) {
      await AnalyticsFixture.event(backend, sessionIdentifier, 'step_viewed', step);
    }
  },

  async transition(
    backend: BackendApplicationFixture,
    sessionIdentifier: string,
    fromStepIdentifier: string,
    toStepIdentifier: string,
    kind = 'forward',
  ): Promise<void> {
    const revision =
      (await backend.database.sessionTransition.count({ where: { sessionIdentifier } })) + 1;
    const operation = await backend.database.sessionOperation.create({
      data: {
        sessionIdentifier,
        operationIdentifier: randomUUID(),
        requestFingerprint: randomUUID(),
        response: {},
      },
    });
    await backend.database.sessionTransition.create({
      data: {
        sessionIdentifier,
        operationIdentifier: operation.operationIdentifier,
        revision,
        kind,
        fromStepIdentifier,
        toStepIdentifier,
      },
    });
  },

  async response(response: Response): Promise<AnalyticsResponse> {
    const value: unknown = await response.json();
    if (!validator(value)) {
      throw new Error(JSON.stringify(validator.errors));
    }

    return value;
  },
} as const;
