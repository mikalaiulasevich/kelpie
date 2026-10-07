import { randomUUID } from 'node:crypto';
import { PublicationService } from '../../source/publications/publication.service.js';
import type { PublishRequest } from '../../source/publications/publication-types.js';
import type { BackendApplicationFixture } from './backend-application.js';
import { ConfigurationImportFixtures } from './configuration-import-fixtures.js';

export const PublicationFixtures = {
  async prepare(backend: BackendApplicationFixture) {
    const administrator = await backend.database.administrator.create({
      data: { username: randomUUID(), passwordHash: 'not-used-by-service-tests' },
    });
    const firstImport = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(1),
    );
    const thirdImport = await backend.configurationImports.import(
      ConfigurationImportFixtures.original(3),
    );

    return {
      administrator,
      firstVersion: firstImport.version,
      thirdVersion: thirdImport.version,
      service: backend.getService(PublicationService),
    };
  },

  request(
    funnelIdentifier: string,
    targetVersionIdentifier: string,
    expectedRevision = 0,
  ): PublishRequest {
    return {
      operationIdentifier: randomUUID(),
      funnelIdentifier,
      targetVersionIdentifier,
      expectedRevision,
    };
  },
} as const;
