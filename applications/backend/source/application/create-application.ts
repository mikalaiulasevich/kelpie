import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { isNull } from 'es-toolkit/predicate';
import { attemptAsync } from 'es-toolkit/util';
import { Server } from 'node:http';
import 'reflect-metadata';

import { Diagnostics } from '../diagnostics/diagnostics.js';
import { FrameworkLogger } from '../diagnostics/framework-logger.js';
import { RequestDiagnostics } from '../diagnostics/request-diagnostics.js';
import type { ApplicationEnvironment } from '../environment/environment-schemas.js';
import { ApplicationEnvironmentReader } from '../environment/read-application-environment.js';
import { RateLimitResponses } from '../transport/rate-limit-responses.js';
import { RequestBodyPolicy } from '../transport/request-body-policy.js';
import { RequestCachePolicy } from '../transport/request-cache-policy.js';
import { TransportMessages } from '../transport/transport-messages.js';
import { TransportPolicy } from '../transport/transport-policy.js';
import { ApplicationMessages } from './application-messages.js';
import { ApplicationCreationOptions } from './application-policy.js';
import { ApplicationModule } from './application.module.js';

const ApplicationSetup = {
  async configure(application: NestFastifyApplication, adapter: FastifyAdapter): Promise<void> {
    const server = adapter.getInstance();

    application.setGlobalPrefix(TransportPolicy.ApiPrefix);

    server.addHook('onRequest', RequestDiagnostics.onRequest);
    server.addHook('onRequest', RequestCachePolicy.onRequest);

    await application.register(helmet);
    await application.register(cookie);
    await application.register(rateLimit, {
      global: false,
      cache: TransportPolicy.RateLimitCacheSize,
      errorResponseBuilder: RateLimitResponses.rejected,
    });

    server.addHook('onRequest', RequestBodyPolicy.validate);

    server.removeAllContentTypeParsers();
    server.addContentTypeParser(
      TransportPolicy.JsonMediaType,
      { parseAs: 'string' },
      RequestBodyPolicy.parser(server),
    );

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

const ApplicationCleanup = {
  async releaseAndRethrow(
    setupError: unknown,
    resource: FastifyAdapter | NestFastifyApplication,
  ): Promise<never> {
    try {
      await resource.close();
    } catch (cleanupError) {
      throw new AggregateError(
        [setupError, cleanupError],
        ApplicationMessages.InitializationCleanupFailed,
        { cause: cleanupError },
      );
    }

    throw setupError;
  },
} as const;

export const ApplicationFactory = {
  async create(
    environment: ApplicationEnvironment = ApplicationEnvironmentReader.read(process.env),
  ): Promise<NestFastifyApplication> {
    Diagnostics.setLevel(environment.logLevel);
    const adapter = new FastifyAdapter({
      bodyLimit: TransportPolicy.JsonBodyLimit,
      logger: false,
      trustProxy: false,
    });
    const [creationError, application] = await attemptAsync(() =>
      NestFactory.create<NestFastifyApplication>(ApplicationModule.register(environment), adapter, {
        ...ApplicationCreationOptions,
        logger: FrameworkLogger,
      }),
    );

    // The successful result is never null, even when the rejected value itself is null.
    if (isNull(application)) {
      return ApplicationCleanup.releaseAndRethrow(creationError, adapter);
    }

    try {
      await ApplicationSetup.configure(application, adapter);

      return application;
    } catch (setupError) {
      return ApplicationCleanup.releaseAndRethrow(setupError, application);
    }
  },
} as const;
