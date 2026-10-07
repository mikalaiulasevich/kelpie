import { isUndefined } from 'es-toolkit/predicate';
import { HttpStatus } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Writable } from 'node:stream';
import { pino, type Logger } from 'pino';
import { LoggingPolicy } from './logging-policy.js';

import {
  DiagnosticEvents,
  DiagnosticEventSeverity,
  DiagnosticSeverity,
} from './diagnostic-policy.js';
import type { DiagnosticRecord, RequestDiagnosticContext } from './diagnostics-types.js';

const DiagnosticLevels = {
  resolve(record: DiagnosticRecord): ValueOf<typeof DiagnosticSeverity> {
    if (!isUndefined(record.status) && record.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return DiagnosticSeverity.Error;
    }

    if (!isUndefined(record.status) && record.status >= HttpStatus.BAD_REQUEST) {
      return DiagnosticSeverity.Warning;
    }

    return DiagnosticEventSeverity[record.event];
  },
} as const;

export const RequestContext = new AsyncLocalStorage<RequestDiagnosticContext>();

export class DiagnosticSink {
  private readonly logger: Logger;
  private blocked = false;
  private droppedRecords = 0;
  private failed = false;

  constructor(
    private readonly destination: Writable,
    minimumLevel: ValueOf<typeof DiagnosticSeverity> = LoggingPolicy.DefaultLevel,
  ) {
    this.destination.on('error', () => {
      this.failed = true;
    });
    this.logger = pino(
      { ...LoggingPolicy.Options, level: minimumLevel },
      { write: (serialized: string) => this.writeSerialized(serialized) },
    );
  }

  setLevel(level: ValueOf<typeof DiagnosticSeverity>): void {
    this.logger.level = level;
  }

  write(record: DiagnosticRecord, level?: ValueOf<typeof DiagnosticSeverity>): void {
    const severity = level ?? DiagnosticLevels.resolve(record);

    if (!this.logger.isLevelEnabled(severity)) {
      return;
    }

    if (this.blocked || this.failed) {
      this.dropRecord();

      return;
    }

    try {
      this.logger[severity]({ ...RequestContext.getStore(), ...record });
    } catch {
      // Logging must never replace the original request/startup failure.
      this.dropRecord();
    }
  }

  private writeSerialized(serialized: string): void {
    const ready = this.destination.write(serialized);

    if (!ready) {
      this.blocked = true;
      this.destination.once('drain', () => this.resume());
    }
  }

  private dropRecord(): void {
    this.droppedRecords = Math.min(Number.MAX_SAFE_INTEGER, this.droppedRecords + 1);
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
