import { AsyncLocalStorage } from 'node:async_hooks';
import { DiagnosticEvents } from './diagnostic-policy.js';
import type { Writable } from 'node:stream';
import type { DiagnosticRecord } from './diagnostics-types.js';

export const RequestContext = new AsyncLocalStorage<Readonly<{ requestIdentifier: string }>>();

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
        `${JSON.stringify({ timestamp: new Date().toISOString(), ...RequestContext.getStore(), ...record })}\n`,
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
