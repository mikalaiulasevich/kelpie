import { HttpAdapterHost } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { createServer } from 'node:http';
import { ApplicationShutdown } from '../../source/application/application-shutdown.js';

export const ShutdownFixture = {
  create() {
    const server = createServer();
    const adapter = new HttpAdapterHost();
    adapter.httpAdapter = new FastifyAdapter();
    adapter.httpAdapter.setHttpServer(server);

    return { server, shutdown: new ApplicationShutdown(adapter) };
  },
} as const;
