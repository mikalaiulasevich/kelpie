import { randomUUID } from 'node:crypto';
import { Ajv } from 'ajv';
import { isPlainObject, isString } from 'es-toolkit/predicate';
import {
  AnalyticsResponseSchemas,
  type AnalyticsResponse,
} from '../../source/analytics/analytics-response.js';
import { AnalyticsCases } from '../cases/analytics-cases.js';
import type { BackendApplicationFixture } from './backend-application.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';

interface AnalyticsSessionScenario {
  readonly sessionIdentifier: string;
  readonly versionIdentifier: string;
  readonly variant?: string;
  readonly expired?: boolean;
  readonly assignmentSource?: string;
  readonly trafficOrigin?: string;
  readonly campaign?: string;
  readonly started?: boolean;
}

const responseValidator = new Ajv({ strict: true }).compile<AnalyticsResponse>(
  AnalyticsResponseSchemas.Response,
);

export const AnalyticsFixture = {
  queryPlan(rows: readonly unknown[]): string {
    return rows
      .flatMap((row) => (isPlainObject(row) && isString(row.detail) ? [row.detail] : []))
      .join('\n');
  },

  async prepare(backend: BackendApplicationFixture) {
    const firstImport = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(1),
    );
    const thirdImport = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(3),
    );
    const versionIdentifiers = {
      1: firstImport.version.identifier,
      3: thirdImport.version.identifier,
    };

    for (const { version, ...scenario } of AnalyticsCases.Sessions) {
      await AnalyticsFixture.session(backend, {
        ...scenario,
        versionIdentifier: versionIdentifiers[version],
      });
    }

    for (const { sessionIdentifier, stepIdentifiers } of AnalyticsCases.Views) {
      await AnalyticsFixture.views(backend, sessionIdentifier, stepIdentifiers);
    }

    for (const {
      sessionIdentifier,
      fromStepIdentifier,
      toStepIdentifier,
      kind,
    } of AnalyticsCases.Transitions) {
      await AnalyticsFixture.transition(
        backend,
        sessionIdentifier,
        fromStepIdentifier,
        toStepIdentifier,
        kind,
      );
    }

    for (const { sessionIdentifier, eventName } of AnalyticsCases.Outcomes) {
      await AnalyticsFixture.event(backend, sessionIdentifier, eventName, 'result');
    }

    return {
      firstVersionIdentifier: firstImport.version.identifier,
      thirdVersionIdentifier: thirdImport.version.identifier,
    };
  },

  async session(
    backend: BackendApplicationFixture,
    scenario: AnalyticsSessionScenario,
  ): Promise<string> {
    const session = await backend.database.session.create({
      data: {
        identifier: scenario.sessionIdentifier,
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
    eventName: string,
    stepIdentifier: string | null,
    source = 'client',
  ): Promise<void> {
    await backend.database.event.create({
      data: {
        identifier: randomUUID(),
        contentFingerprint: randomUUID(),
        sessionIdentifier,
        name: eventName,
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
    stepIdentifiers: readonly string[],
  ): Promise<void> {
    for (const stepIdentifier of stepIdentifiers) {
      await AnalyticsFixture.event(backend, sessionIdentifier, 'step_viewed', stepIdentifier);
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

    if (!responseValidator(value)) {
      throw new Error(JSON.stringify(responseValidator.errors));
    }

    return value;
  },
} as const;
