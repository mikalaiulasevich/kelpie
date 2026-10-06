import { HttpStatus } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  DiagnosticEvents,
  DiagnosticEventSeverity,
  DiagnosticSeverity,
} from './diagnostic-policy.js';
import type { Writable } from 'node:stream';
import type { DiagnosticRecord, RequestDiagnosticContext } from './diagnostics-types.js';

const DiagnosticLevels = {
  resolve(record: DiagnosticRecord): ValueOf<typeof DiagnosticSeverity> {
    if (record.status !== undefined && record.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return DiagnosticSeverity.Error;
    }

    if (record.status !== undefined && record.status >= HttpStatus.BAD_REQUEST) {
      return DiagnosticSeverity.Warning;
    }

    return DiagnosticEventSeverity[record.event];
  },
} as const;

export const RequestContext = new AsyncLocalStorage<RequestDiagnosticContext>();

export class DiagnosticSink {
  private blocked = false;
  private droppedRecords = 0;
  private failed = false;

  constructor(private readonly destination: Writable) {
    this.destination.on('error', () => {
      this.failed = true;
    });
  }

  write(record: DiagnosticRecord): void {
    if (this.blocked || this.failed) {
      this.droppedRecords = Math.min(Number.MAX_SAFE_INTEGER, this.droppedRecords + 1);

      return;
    }

    try {
      const ready = this.destination.write(
        `${JSON.stringify({ timestamp: new Date().toISOString(), level: DiagnosticLevels.resolve(record), ...RequestContext.getStore(), ...record })}\n`,
      );

      if (!ready) {
        this.blocked = true;
        this.destination.once('drain', () => this.resume());
      }
    } catch {
      // Logging must never replace the original request/startup failure.
      this.droppedRecords = Math.min(Number.MAX_SAFE_INTEGER, this.droppedRecords + 1);
    }
  }

  private resume(): void {
    this.blocked = false;
    const droppedRecords = this.droppedRecords;
    this.droppedRecords = 0;

    if (droppedRecords > 0) {
      this.write({ event: DiagnosticEvents.RecordsDropped, droppedRecords });
    }
  }
}

export const Diagnostics = new DiagnosticSink(process.stderr);
