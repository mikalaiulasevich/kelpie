import { isNull } from 'es-toolkit/predicate';
import { AnalyticsAcquisitionCases } from '../cases/analytics-acquisition-cases.js';
import type { BackendApplicationFixture } from './backend-application.js';
import { AnalyticsFixture } from './analytics-fixture.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';

export const AnalyticsAcquisitionFixture = {
  async prepare(backend: BackendApplicationFixture) {
    const imported = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(1),
    );

    for (const campaign of AnalyticsAcquisitionCases.Campaigns) {
      const sessionIdentifier = await AnalyticsFixture.session(backend, {
        sessionIdentifier: `acquisition-${String(campaign)}`,
        versionIdentifier: imported.version.identifier,
      });
      await backend.database.session.update({
        where: { identifier: sessionIdentifier },
        data: {
          campaign,
          acquisitionParameters: isNull(campaign)
            ? {}
            : { utm_source: campaign, utm_medium: campaign },
        },
      });
    }

    return imported.version.identifier;
  },
} as const;
