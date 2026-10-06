import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { RequestDiagnostics } from '../diagnostics/request-diagnostics.js';
import { Server } from 'node:http';
import { ApplicationMessages } from './application-messages.js';
import { ApplicationEnvironmentReader } from '../environment/read-application-environment.js';
import type { ApplicationEnvironment } from '../environment/environment-schemas.js';
import { ApplicationModule } from './application.module.js';
import { TransportMessages } from '../transport/transport-messages.js';
import { TransportPolicy } from '../transport/transport-policy.js';
import { PublicExceptionFilter } from '../transport/public-exception.filter.js';

const ApplicationSetup = {
  configure(application: NestExpressApplication): void {
    application.disable(TransportPolicy.FrameworkHeader);
    application.setGlobalPrefix(TransportPolicy.ApiPrefix);
    application.use(RequestDiagnostics.middleware);
    application.use(helmet());
    application.useBodyParser(TransportPolicy.BodyParser, {
      limit: TransportPolicy.JsonBodyLimit,
      strict: true,
      inflate: TransportPolicy.AllowCompressedBodies,
    });
    application.useGlobalFilters(new PublicExceptionFilter());
    application.enableShutdownHooks();

    const server: unknown = application.getHttpServer();

    if (!(server instanceof Server)) {
      throw new Error(TransportMessages.UnsupportedServer);
    }

    server.requestTimeout = TransportPolicy.RequestTimeoutMilliseconds;
    server.headersTimeout = TransportPolicy.HeadersTimeoutMilliseconds;
    server.keepAliveTimeout = TransportPolicy.KeepAliveTimeoutMilliseconds;
  },
} as const;

export const ApplicationFactory = {
  async create(
    environment: ApplicationEnvironment = ApplicationEnvironmentReader.read(process.env),
  ): Promise<NestExpressApplication> {
    const application = await NestFactory.create<NestExpressApplication>(
      ApplicationModule.register(environment),
      { bodyParser: false, logger: false, abortOnError: false },
    );

    try {
      ApplicationSetup.configure(application);

      return application;
    } catch (setupError) {
      try {
        await application.close();
      } catch (cleanupError) {
        throw new AggregateError(
          [setupError, cleanupError],
          ApplicationMessages.InitializationCleanupFailed,
          { cause: cleanupError },
        );
      }

      throw setupError;
    }
  },
} as const;
