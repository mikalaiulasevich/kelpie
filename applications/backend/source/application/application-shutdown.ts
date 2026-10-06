import {
  Inject,
  Injectable,
  type BeforeApplicationShutdown,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Server } from 'node:http';
import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../diagnostics/diagnostic-policy.js';
import { ApplicationPolicy } from './application-policy.js';

@Injectable()
export class ApplicationShutdown implements BeforeApplicationShutdown, OnApplicationShutdown {
  private deadline: Optional<ReturnType<typeof setTimeout>>;

  constructor(@Inject(HttpAdapterHost) private readonly adapter: HttpAdapterHost) {}

  beforeApplicationShutdown(): void {
    const server: unknown = this.adapter.httpAdapter?.getHttpServer();

    if (!(server instanceof Server)) {
      return;
    }

    this.deadline = setTimeout(() => {
      Diagnostics.write({ event: DiagnosticEvents.ShutdownDeadlineExceeded });
      server.closeAllConnections();
    }, ApplicationPolicy.ShutdownDrainMilliseconds);
    this.deadline.unref();
  }

  onApplicationShutdown(): void {
    clearTimeout(this.deadline);
    this.deadline = undefined;
  }
}
