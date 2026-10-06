import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Server } from 'node:http';
import { ApplicationModule } from './application.module.js';
import { TransportMessages } from './transport/transport-messages.js';
import { TransportPolicy } from './transport/transport-policy.js';
import { PublicExceptionFilter } from './transport/public-exception.filter.js';

export async function createApplication(): Promise<NestExpressApplication> {
  const application = await NestFactory.create<NestExpressApplication>(ApplicationModule, {
    bodyParser: false,
    logger: ['log', 'warn'],
  });

  application.disable('x-powered-by');
  application.setGlobalPrefix(TransportPolicy.ApiPrefix);
  application.use(helmet());
  application.useBodyParser('json', { limit: TransportPolicy.JsonBodyLimit, strict: true });
  application.useGlobalFilters(new PublicExceptionFilter());
  application.enableShutdownHooks();

  const server: unknown = application.getHttpServer();

  if (!(server instanceof Server)) {
    throw new Error(TransportMessages.UnsupportedServer);
  }

  server.requestTimeout = TransportPolicy.RequestTimeoutMilliseconds;
  server.headersTimeout = TransportPolicy.HeadersTimeoutMilliseconds;
  server.keepAliveTimeout = TransportPolicy.KeepAliveTimeoutMilliseconds;

  return application;
}
