import { HttpAdapterHost } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { createServer } from 'node:http';
import { ApplicationShutdown } from '../../source/application/application-shutdown.js';

export const ShutdownFixture = {
  create() {
    const server = createServer();
    const adapter = new HttpAdapterHost();
    adapter.httpAdapter = new ExpressAdapter();
    adapter.httpAdapter.setHttpServer(server);

    return { server, shutdown: new ApplicationShutdown(adapter) };
  },
} as const;
