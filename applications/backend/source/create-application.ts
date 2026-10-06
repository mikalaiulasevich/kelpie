import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Server } from 'node:http';
import { ApplicationModule } from './application.module.js';
import { PublicExceptionFilter } from './transport/public-exception.filter.js';

export async function createApplication(): Promise<NestExpressApplication> {
  const application = await NestFactory.create<NestExpressApplication>(ApplicationModule, {
    bodyParser: false,
    logger: ['log', 'warn'],
  });

  application.disable('x-powered-by');
  application.setGlobalPrefix('api');
  application.use(helmet());
  application.useBodyParser('json', { limit: '256kb', strict: true });
  application.useGlobalFilters(new PublicExceptionFilter());
  application.enableShutdownHooks();

  const server: unknown = application.getHttpServer();

  if (!(server instanceof Server)) {
    throw new Error('HTTP server adapter is unsupported.');
  }

  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;

  return application;
}
