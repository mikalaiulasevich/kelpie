import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { vi } from 'vitest';
import { ApplicationFactory } from '../../source/application/create-application.js';
import { BackendApplicationFixture } from './backend-application.js';
import { BackendCleanupFailure } from './backend-cleanup-failure.js';

export const ApplicationCommandFixture = {
  async create() {
    const create = ApplicationFactory.create;
    let application: Optional<NestFastifyApplication>;
    const factory = vi
      .spyOn(ApplicationFactory, 'create')
      .mockImplementation(async (environment) => {
        application = await create(environment);

        return application;
      });

    try {
      const backend = await BackendApplicationFixture.create();

      if (!application) {
        await backend.close();
        throw new Error('The command fixture did not capture its application.');
      }

      return { backend, application };
    } finally {
      factory.mockRestore();
    }
  },

  failAfterClose(application: NestFastifyApplication, error: Error) {
    BackendCleanupFailure.server(error);

    return vi.spyOn(application, 'close');
  },
} as const;
