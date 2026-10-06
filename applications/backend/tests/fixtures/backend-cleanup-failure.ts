import { vi } from 'vitest';
import { NestApplication } from '@nestjs/core';
import { BackendApplicationFixture } from './backend-application.js';

export const BackendCleanupFailure = {
  application(error: Error): void {
    const originalClose = BackendApplicationFixture.prototype.close;
    const Cleanup = {
      async close(this: BackendApplicationFixture): Promise<void> {
        // Release real resources before simulating failure at the fixture boundary.
        await originalClose.call(this);
        throw error;
      },
    } as const;
    vi.spyOn(BackendApplicationFixture.prototype, 'close').mockImplementation(Cleanup.close);
  },

  server(error: Error): void {
    const originalClose = NestApplication.prototype.close;
    const Cleanup = {
      async close(this: NestApplication): Promise<void> {
        await originalClose.call(this);
        throw error;
      },
    } as const;
    vi.spyOn(NestApplication.prototype, 'close').mockImplementationOnce(Cleanup.close);
  },
} as const;
