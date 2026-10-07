import { vi } from 'vitest';
import { HealthController } from '../../source/health/health.controller.js';

export const RequestFailureFixture = {
  unrecognizedApplicationError(): void {
    RequestFailureFixture.install(
      Object.assign(new Error('private failure'), {
        status: 400,
        statusCode: 400,
        code: 'PRIVATE_UNRECOGNIZED_CODE',
      }),
    );
  },

  unreadableCode(): void {
    const error = Object.defineProperty(new Error('private failure'), 'code', {
      get() {
        throw new Error('private accessor');
      },
    });
    RequestFailureFixture.install(error);
  },

  install(error: Error): void {
    const originalHandler = HealthController.prototype.live;
    const failingHandler = vi.spyOn(HealthController.prototype, 'live').mockImplementation(() => {
      throw error;
    });

    // Nest reads route metadata from the method function before binding it.
    for (const key of Reflect.getMetadataKeys(originalHandler)) {
      Reflect.defineMetadata(key, Reflect.getMetadata(key, originalHandler), failingHandler);
    }
  },
} as const;
