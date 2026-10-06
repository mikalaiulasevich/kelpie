import { HttpAdapterHost } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ApplicationShutdown } from '../../source/application/application-shutdown.js';

export const ShutdownFixture = {
  create() {
    const adapter = new HttpAdapterHost();
    adapter.httpAdapter = new FastifyAdapter();
    const server = adapter.httpAdapter.getInstance().server;

    return { server, shutdown: new ApplicationShutdown(adapter) };
  },
} as const;
