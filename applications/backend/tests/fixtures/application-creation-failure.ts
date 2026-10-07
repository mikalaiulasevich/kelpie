import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { isUndefined } from 'es-toolkit/predicate';
import { vi } from 'vitest';
import { ApplicationEnvironmentReader } from '../../source/environment/read-application-environment.js';
import { ApplicationMode, EnvironmentFields } from '../../source/environment/environment-policy.js';

export const ApplicationCreationFailure = {
  prepare(setupError: unknown, cleanupError?: Error) {
    const originalClose = FastifyAdapter.prototype.close;
    const Cleanup = {
      async close(this: FastifyAdapter): Promise<void> {
        // Release the real Fastify server before simulating a cleanup rejection.
        await originalClose.call(this);

        if (!isUndefined(cleanupError)) {
          throw cleanupError;
        }
      },
    } as const;
    const create = vi.spyOn(NestFactory, 'create').mockRejectedValue(setupError);
    const close = vi.spyOn(FastifyAdapter.prototype, 'close').mockImplementation(Cleanup.close);
    const environment = ApplicationEnvironmentReader.read({
      [EnvironmentFields.Mode]: ApplicationMode.Test,
    });

    return { create, close, environment };
  },
} as const;
