import { describe, expect, it, vi } from 'vitest';
import { ErrorDiagnostics } from '../../source/diagnostics/error-diagnostics.js';
import { DiagnosticCases } from '../cases/diagnostic-cases.js';
import { DiagnosticFixtures } from '../fixtures/diagnostic-errors.js';

describe('Error diagnostics', () => {
  it('reports only an exact allowlisted environment message', () => {
    const safe = ErrorDiagnostics.describe(new Error('PORT must be an integer from 1 to 65535.'));
    const unsafe = ErrorDiagnostics.describe(
      new Error('PORT must be an integer from 1 to 65535. private-value'),
    );

    expect(safe.safeMessage).toBe('PORT must be an integer from 1 to 65535.');
    expect(unsafe.safeMessage).toBeUndefined();
    expect(JSON.stringify(unsafe)).not.toContain('private-value');
  });

  it('redacts multiline messages, file paths and unrecognized error codes', () => {
    const error = DiagnosticFixtures.error(
      'Error: password=private-password\nanswer=private-answer\n    at privateFunction (/private/user/private-file.ts:12:34)',
      'private-token',
    );

    const description = ErrorDiagnostics.describe(error);

    expect(description).toMatchObject({ classification: 'error', code: undefined });
    expect(description.frames.length).toBeGreaterThan(0);
    expect(description.frames).not.toContainEqual(
      expect.objectContaining({ line: 12, column: 34 }),
    );
    expect(JSON.stringify(description)).not.toMatch(/private|password|answer|token/);
  });

  it('excludes stack-shaped message lines from frame locations and fingerprints', () => {
    const descriptions = DiagnosticCases.MultilineMessages.map((message) =>
      ErrorDiagnostics.describe(DiagnosticFixtures.multilineError(message)),
    );

    expect(descriptions[0]).toEqual(descriptions[1]);
    expect(descriptions[0]?.frames.length).toBeGreaterThan(0);
    expect(descriptions[0]?.frames).not.toContainEqual(
      expect.objectContaining({ line: 123456, column: 789 }),
    );
  });

  it.each(DiagnosticCases.ChangedHeaders)(
    'ignores the cached stack when $property becomes $replacement',
    ({ property, replacement }) => {
      const descriptions = DiagnosticCases.MultilineMessages.map((message) =>
        ErrorDiagnostics.describe(DiagnosticFixtures.cachedError(message, property, replacement)),
      );

      expect(descriptions[0]).toEqual(descriptions[1]);
      expect(descriptions[0]?.frames.length).toBeGreaterThan(0);
      expect(descriptions[0]?.frames).not.toContainEqual(
        expect.objectContaining({ line: 123456, column: 789 }),
      );
    },
  );

  it('keeps an allowlisted database failure code and stable callsite fingerprint', () => {
    const first = DiagnosticFixtures.error(
      'Error: first secret\n    at query (/source/database.ts:9:2)',
      'P2021',
    );
    const second = DiagnosticFixtures.error(
      'Error: different secret\n    at query (/source/database.ts:9:2)',
      'P2021',
    );

    const descriptions = [first, second].map((error) => ErrorDiagnostics.describe(error));

    expect(descriptions[0]).toEqual(descriptions[1]);
    expect(descriptions[0]?.code).toBe('P2021');
  });

  it('bounds reporting-site frames independently of the supplied stack', () => {
    const error = DiagnosticFixtures.error(
      'Error: private\n    at input (/private/file:123456:789)',
    );

    expect(DiagnosticFixtures.describeAtDepth(20, error).frames).toHaveLength(6);
  });

  it('never reads the original error stack getter', () => {
    const error = new Error('secret');
    const stackGetter = vi.fn(() => {
      throw new Error('private accessor');
    });
    Object.defineProperty(error, 'stack', { get: stackGetter });

    expect(ErrorDiagnostics.describe(error)).toMatchObject({ classification: 'error' });
    expect(stackGetter).not.toHaveBeenCalled();
  });

  it('reads allowlisted metadata once per report', () => {
    const messageGetter = vi.fn(() => 'PORT must be an integer from 1 to 65535.');
    const codeGetter = vi.fn(() => 'P2021');
    const error = DiagnosticFixtures.metadataAccessors(messageGetter, codeGetter);

    expect(ErrorDiagnostics.describe(error)).toMatchObject({
      classification: 'error',
      safeMessage: 'PORT must be an integer from 1 to 65535.',
      code: 'P2021',
    });
    expect(messageGetter).toHaveBeenCalledTimes(1);
    expect(codeGetter).toHaveBeenCalledTimes(1);
  });

  it('contains failures from error metadata accessors', () => {
    const error = DiagnosticFixtures.unreadableMessage();

    expect(ErrorDiagnostics.describe(error)).toMatchObject({
      classification: 'unknown',
      frames: [],
    });
  });

  it('handles non-error thrown values without exposing their content', () => {
    const description = ErrorDiagnostics.describe({ password: 'secret', message: 'secret' });

    expect(description).toMatchObject({ classification: 'unknown', frames: [] });
    expect(JSON.stringify(description)).not.toContain('secret');
  });
});
