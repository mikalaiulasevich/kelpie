import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { DiagnosticSink } from '../../source/diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../../source/diagnostics/diagnostic-policy.js';
import { DiagnosticStream } from '../fixtures/diagnostic-stream.js';

describe('Diagnostic sink', () => {
  it('drops records during backpressure and reports the count once after draining', () => {
    const stream = new DiagnosticStream();
    const sink = new DiagnosticSink(stream);

    try {
      sink.write({ event: DiagnosticEvents.ApplicationStarted });
      sink.write({ event: DiagnosticEvents.ApplicationStarted });
      sink.write({ event: DiagnosticEvents.ApplicationStarted });
      expect(stream.chunks).toHaveLength(1);

      stream.flush();
      expect(stream.chunks).toHaveLength(2);
      expect(JSON.parse(stream.chunks[1] ?? '')).toMatchObject({
        event: 'records_dropped',
        droppedRecords: 2,
      });

      stream.flush();
      sink.write({ event: DiagnosticEvents.ApplicationStarted });
      expect(stream.chunks).toHaveLength(3);
      expect(JSON.parse(stream.chunks[2] ?? '')).toMatchObject({ event: 'application_started' });
      stream.flush();
    } finally {
      stream.destroy();
    }
  });

  it('contains asynchronous destination failures and stops further writes', async () => {
    const stream = new DiagnosticStream();
    const sink = new DiagnosticSink(stream);

    try {
      sink.write({ event: DiagnosticEvents.ApplicationStarted });
      const failed = once(stream, 'error');
      stream.flush(new Error('private destination failure'));
      await failed;

      expect(() => sink.write({ event: DiagnosticEvents.ApplicationStarted })).not.toThrow();
      expect(stream.chunks).toHaveLength(1);
    } finally {
      stream.destroy();
    }
  });
});
