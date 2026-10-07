import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DatabaseService } from '../database/database.service.js';
import type { ApplicationCommandMessages } from './application-command-types.js';

export const ApplicationCommand = {
  async run<Result>(
    application: NestFastifyApplication,
    operation: () => Promise<Result>,
    messages: ApplicationCommandMessages,
  ): Promise<Result> {
    let result: Result;

    try {
      await application.init();

      if (!(await application.get(DatabaseService).checkReadiness())) {
        throw new Error(messages.DatabaseNotReady);
      }

      result = await operation();
    } catch (error) {
      try {
        await application.close();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], messages.CleanupFailed, {
          cause: cleanupError,
        });
      }

      throw error;
    }

    // A failed close must not be retried or reported as a failed operation.
    await application.close();

    return result;
  },
} as const;
