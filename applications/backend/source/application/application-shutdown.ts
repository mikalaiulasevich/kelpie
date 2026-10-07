import { isUndefined } from 'es-toolkit/predicate';
import {
  Inject,
  Injectable,
  type BeforeApplicationShutdown,
  type OnModuleInit,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Server } from 'node:http';
import type { Socket } from 'node:net';
import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../diagnostics/diagnostic-policy.js';
import { ApplicationPolicy } from './application-policy.js';

@Injectable()
export class ApplicationShutdown
  implements OnModuleInit, BeforeApplicationShutdown, OnApplicationShutdown
{
  private readonly connections = new Set<Socket>();

  private readonly trackConnection = (connection: Socket): void => {
    this.connections.add(connection);
    connection.once('close', () => this.connections.delete(connection));
  };

  private deadline: Optional<ReturnType<typeof setTimeout>>;

  constructor(@Inject(HttpAdapterHost) private readonly adapter: HttpAdapterHost) {}

  onModuleInit(): void {
    const server: unknown = this.adapter.httpAdapter?.getHttpServer();

    if (server instanceof Server) {
      server.on('connection', this.trackConnection);
    }
  }

  beforeApplicationShutdown(): void {
    if (!isUndefined(this.deadline)) {
      return;
    }

    const server: unknown = this.adapter.httpAdapter?.getHttpServer();

    if (!(server instanceof Server)) {
      return;
    }

    this.deadline = setTimeout(() => {
      Diagnostics.write({ event: DiagnosticEvents.ShutdownDeadlineExceeded });
      // Bun cannot force-close through Server after close() has detached its native listener.
      for (const connection of this.connections) {
        connection.destroy();
      }

      server.closeAllConnections();
    }, ApplicationPolicy.ShutdownDrainMilliseconds);
    this.deadline.unref();
  }

  onApplicationShutdown(): void {
    clearTimeout(this.deadline);
    this.deadline = undefined;
    const server: unknown = this.adapter.httpAdapter?.getHttpServer();

    if (server instanceof Server) {
      server.removeListener('connection', this.trackConnection);
    }

    this.connections.clear();
  }
}
