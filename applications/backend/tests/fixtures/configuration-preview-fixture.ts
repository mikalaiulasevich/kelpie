import { randomUUID } from 'node:crypto';
import { AdministrationFixture } from './administration.js';
import type { BackendApplicationFixture } from './backend-application.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';
import { PublicationHttpFixtures } from './publication-http-fixtures.js';

export const ConfigurationPreviewFixture = {
  async prepare(backend: BackendApplicationFixture) {
    const cookie = AdministrationFixture.cookie(await AdministrationFixture.signIn(backend));
    const imported = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(3),
    );
    const route = `configurations/${imported.version.identifier}/preview`;
    const body = {
      operationIdentifier: randomUUID(),
      clientTimestamp: new Date().toISOString(),
      acquisition: { utm_source: 'load-test', utm_campaign: 'isolated-run' },
    };

    return {
      cookie,
      body,
      versionIdentifier: imported.version.identifier,
      post(document: unknown, administratorCookie = cookie) {
        return PublicationHttpFixtures.post(backend, route, administratorCookie, document);
      },
    };
  },
} as const;
