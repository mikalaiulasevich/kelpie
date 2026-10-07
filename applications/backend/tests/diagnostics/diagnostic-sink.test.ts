import { once } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { DiagnosticSink, RequestContext } from '../../source/diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../../source/diagnostics/diagnostic-policy.js';
import { DiagnosticLevelCases } from '../cases/diagnostic-level-cases.js';
import { DiagnosticRecordsFixture } from '../fixtures/diagnostic-records.js';
import { DiagnosticStream } from '../fixtures/diagnostic-stream.js';

describe('Diagnostic sink', () => {
  it.each(DiagnosticLevelCases.Explicit)(
    'writes structured Pino %s records with correlation',
    (level) => {
      const stream = new DiagnosticStream();
      const sink = new DiagnosticSink(stream, 'trace');

      try {
        RequestContext.run({ requestIdentifier: 'server-correlation' }, () => {
          sink.write({ event: DiagnosticEvents.ApplicationStarted }, level);
        });

        expect(JSON.parse(stream.chunks[0] ?? '')).toEqual({
          time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          level,
          requestIdentifier: 'server-correlation',
          event: 'application_started',
        });
        stream.flush();
      } finally {
        stream.destroy();
      }
    },
  );

  it('applies configured thresholds without counting filtered records as dropped', () => {
    const stream = new DiagnosticStream();
    const sink = new DiagnosticSink(stream);

    try {
      sink.write({ event: DiagnosticEvents.ApplicationStarted }, 'debug');
      expect(stream.chunks).toHaveLength(0);
      sink.setLevel('debug');
      sink.write({ event: DiagnosticEvents.ApplicationStarted }, 'debug');
      sink.write({ event: DiagnosticEvents.ApplicationStarted }, 'trace');
      stream.flush();

      expect(stream.chunks).toHaveLength(1);
      expect(JSON.parse(stream.chunks[0] ?? '')).toMatchObject({ level: 'debug' });
    } finally {
      stream.destroy();
    }
  });

  it('redacts sensitive fields while retaining safe structured metadata', () => {
    const stream = new DiagnosticStream();
    const sink = new DiagnosticSink(stream);

    try {
      sink.write(DiagnosticRecordsFixture.sensitive());

      expect(stream.chunks[0]).not.toContain('private-log-secret');
      expect(JSON.parse(stream.chunks[0] ?? '')).toMatchObject({
        event: 'application_started',
        metadata: { safe: 'retained' },
        error: { classification: 'error', fingerprint: 'reporting-site', frames: [] },
      });
      stream.flush();
    } finally {
      stream.destroy();
    }
  });

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

  it('treats a synchronous destination failure as terminal without retrying writes', () => {
    const stream = new PassThrough();
    const sink = new DiagnosticSink(stream);
    const destination = vi.spyOn(stream, 'write').mockImplementationOnce(() => {
      throw new Error('private destination failure');
    });

    try {
      expect(() => sink.write({ event: DiagnosticEvents.ApplicationStarted })).not.toThrow();
      expect(() => sink.write({ event: DiagnosticEvents.ApplicationStarted })).not.toThrow();
      expect(() => sink.write({ event: DiagnosticEvents.ApplicationStarted })).not.toThrow();

      expect(destination).toHaveBeenCalledOnce();
      expect(stream.read()).toBeNull();
    } finally {
      destination.mockRestore();
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
