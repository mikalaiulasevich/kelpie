import { DatabaseReadService } from '../../source/database/database-read.service.js';
import { AnalyticsResultBatch } from '../../source/analytics/analytics-result-batch.js';
import { AnalyticsPolicy } from '../../source/analytics/analytics-policy.js';
import { AnalyticsInputs } from '../../source/analytics/analytics-inputs.js';
import { AnalyticsQueries } from '../../source/analytics/analytics-queries.js';
import { AnalyticsInsightsRead } from '../../source/analytics/analytics-insights.js';
import { AnalyticsResults } from '../../source/analytics/analytics-results.js';
import type { BackendApplicationFixture } from './backend-application.js';
import { AnalyticsFixture } from './analytics-fixture.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';

export const AnalyticsMaturityFixture = {
  async prepare(backend: BackendApplicationFixture) {
    const imported = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(1),
    );
    const sessionIdentifier = await AnalyticsFixture.session(backend, {
      sessionIdentifier: 'expired-navigation',
      versionIdentifier: imported.version.identifier,
    });
    await AnalyticsFixture.views(backend, sessionIdentifier, ['intro']);
    await backend.database.session.update({
      where: { identifier: sessionIdentifier },
      data: {
        createdAt: new Date('2026-01-01T00:00:00Z'),
        expiresAt: new Date('2026-01-02T00:00:00Z'),
      },
    });
    await backend.database.event.updateMany({
      where: { sessionIdentifier },
      data: { serverTimestamp: new Date('2026-01-01T00:00:00Z') },
    });
    const administrator = await backend.database.administrator.findFirstOrThrow();
    await backend.database.businessOutcome.create({
      data: {
        externalIdentifier: 'lead-after-navigation-expiry',
        source: 'fixture',
        sessionIdentifier,
        kind: 'lead',
        occurredAt: new Date('2026-01-03T12:00:00Z'),
        provenance: 'integration',
        administratorIdentifier: administrator.identifier,
      },
    });

    return imported.version.identifier;
  },

  async read(
    backend: BackendApplicationFixture,
    versionIdentifier: string,
    now: string,
    conversionWindowHours?: string,
  ) {
    const query = AnalyticsInputs.query({
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier,
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
      ...(conversionWindowHours ? { conversionWindowHours } : {}),
    });
    const timestamp = new Date(now);

    return backend.getService(DatabaseReadService).read(
      async (snapshot) => {
        const cohort = AnalyticsQueries.cohort(query, [versionIdentifier], timestamp);
        const plan = await AnalyticsInsightsRead.prepare(
          snapshot.transaction,
          query,
          [versionIdentifier],
          timestamp,
        );
        const statements = [AnalyticsQueries.steps(cohort), ...plan.statements];
        const batch = new AnalyticsResultBatch(
          await snapshot.queryMany(statements),
          statements.length,
        );
        const steps = AnalyticsResults.steps(batch.next());
        const insights = AnalyticsInsightsRead.project(
          plan,
          { summaries: [], steps, edges: [] },
          batch,
        );

        return { steps, insights };
      },
      { timeout: AnalyticsPolicy.TransactionTimeout },
    );
  },
} as const;
