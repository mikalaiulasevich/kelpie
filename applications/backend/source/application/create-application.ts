import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { Server } from 'node:http';

import { RequestDiagnostics } from '../diagnostics/request-diagnostics.js';
import { ApplicationMessages } from './application-messages.js';
import { ApplicationCreationOptions } from './application-policy.js';
import { ApplicationEnvironmentReader } from '../environment/read-application-environment.js';
import type { ApplicationEnvironment } from '../environment/environment-schemas.js';
import { ApplicationModule } from './application.module.js';
import { TransportMessages } from '../transport/transport-messages.js';
import { TransportPolicy } from '../transport/transport-policy.js';
import { RequestBodyPolicy } from '../transport/request-body-policy.js';
import { PublicExceptionFilter } from '../transport/public-exception.filter.js';

const ApplicationSetup = {
  async configure(application: NestFastifyApplication, adapter: FastifyAdapter): Promise<void> {
    const server = adapter.getInstance();
    application.setGlobalPrefix(TransportPolicy.ApiPrefix);
    server.addHook('onRequest', RequestDiagnostics.onRequest);
    await application.register(helmet);
    server.addHook('onRequest', RequestBodyPolicy.validate);
    server.removeAllContentTypeParsers();
    server.addContentTypeParser(
      TransportPolicy.JsonMediaType,
      { parseAs: 'string' },
      RequestBodyPolicy.parser(server),
    );
    application.useGlobalFilters(new PublicExceptionFilter());
    application.enableShutdownHooks();

    const httpServer: unknown = application.getHttpServer();

    if (!(httpServer instanceof Server)) {
      throw new Error(TransportMessages.UnsupportedServer);
    }

    httpServer.requestTimeout = TransportPolicy.RequestTimeoutMilliseconds;
    httpServer.headersTimeout = TransportPolicy.HeadersTimeoutMilliseconds;
    httpServer.keepAliveTimeout = TransportPolicy.KeepAliveTimeoutMilliseconds;
  },
} as const;

export const ApplicationFactory = {
  async create(
    environment: ApplicationEnvironment = ApplicationEnvironmentReader.read(process.env),
  ): Promise<NestFastifyApplication> {
    const adapter = new FastifyAdapter({
      bodyLimit: TransportPolicy.JsonBodyLimit,
      logger: false,
      trustProxy: false,
    });
    let application: Optional<NestFastifyApplication>;

    try {
      application = await NestFactory.create<NestFastifyApplication>(
        ApplicationModule.register(environment),
        adapter,
        ApplicationCreationOptions,
      );
      await ApplicationSetup.configure(application, adapter);

      return application;
    } catch (setupError) {
      try {
        if (application) {
          await application.close();
        } else {
          await adapter.close();
        }
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
