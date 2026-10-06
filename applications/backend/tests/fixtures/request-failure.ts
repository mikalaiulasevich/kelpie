import { vi } from 'vitest';
import { HealthController } from '../../source/health/health.controller.js';

export const RequestFailureFixture = {
  unrecognizedApplicationError(): void {
    const originalHandler = HealthController.prototype.live;
    const failingHandler = vi.spyOn(HealthController.prototype, 'live').mockImplementation(() => {
      throw Object.assign(new Error('private failure'), {
        status: 400,
        statusCode: 400,
        code: 'PRIVATE_UNRECOGNIZED_CODE',
      });
    });

    // Nest reads route metadata from the method function before binding it.
    for (const key of Reflect.getMetadataKeys(originalHandler)) {
      Reflect.defineMetadata(key, Reflect.getMetadata(key, originalHandler), failingHandler);
    }
  },
} as const;
