import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { vi } from 'vitest';
import { BackendApplicationFixture } from './backend-application.js';
import { BackendCleanupFailure } from './backend-cleanup-failure.js';

export const ApplicationCommandFixture = {
  async create() {
    const backend = await BackendApplicationFixture.create();

    return { backend, application: backend.getApplication() };
  },

  failAfterClose(application: NestFastifyApplication, error: Error) {
    BackendCleanupFailure.server(error);

    return vi.spyOn(application, 'close');
  },
} as const;
