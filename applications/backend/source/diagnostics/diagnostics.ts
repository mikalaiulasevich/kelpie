import { AsyncLocalStorage } from 'node:async_hooks';
import { DiagnosticEvents } from './diagnostic-policy.js';
import type { ErrorDescription } from './error-diagnostics.js';

export interface DiagnosticRecord {
  readonly event: ValueOf<typeof DiagnosticEvents>;
  readonly requestIdentifier?: string;
  readonly method?: string;
  readonly route?: string;
  readonly status?: number;
  readonly durationMilliseconds?: number;
  readonly reason?: 'database_query_failed' | 'migrations_incomplete';
  readonly phase?: 'creation' | 'listen' | 'cleanup';
  readonly error?: ErrorDescription;
  readonly droppedRecords?: number;
}

export const RequestContext = new AsyncLocalStorage<Readonly<{ requestIdentifier: string }>>();

class DiagnosticSink {
  private blocked = false;
  private droppedRecords = 0;

  write(record: DiagnosticRecord): void {
    if (this.blocked) {
      this.droppedRecords = Math.min(Number.MAX_SAFE_INTEGER, this.droppedRecords + 1);

      return;
    }

    try {
      const ready = process.stderr.write(
        `${JSON.stringify({ timestamp: new Date().toISOString(), ...RequestContext.getStore(), ...record })}\n`,
      );

      if (!ready) {
        this.blocked = true;
        process.stderr.once('drain', () => this.resume());
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

export const Diagnostics = new DiagnosticSink();
