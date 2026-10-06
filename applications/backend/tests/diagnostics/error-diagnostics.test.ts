import { describe, expect, it } from 'vitest';
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
    expect(description.frames).toEqual([
      { location: expect.stringMatching(/^[a-f0-9]{20}$/), line: 12, column: 34 },
    ]);
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

  it('keeps an allowlisted database failure code and stable callsite fingerprint', () => {
    const first = DiagnosticFixtures.error(
      'Error: first secret\n    at query (/source/database.ts:9:2)',
      'P2021',
    );
    const second = DiagnosticFixtures.error(
      'Error: different secret\n    at query (/source/database.ts:9:2)',
      'P2021',
    );

    expect(ErrorDiagnostics.describe(first)).toEqual(ErrorDiagnostics.describe(second));
    expect(ErrorDiagnostics.describe(first).code).toBe('P2021');
  });

  it('bounds the number of captured frames', () => {
    const stack = [
      'Error: secret',
      ...Array.from(
        { length: 100 },
        (_, index) => `    at method (/private/file.ts:${index + 1}:2)`,
      ),
    ].join('\n');

    expect(ErrorDiagnostics.describe(DiagnosticFixtures.error(stack)).frames).toHaveLength(6);
  });

  it('does not invoke a throwing error accessor beyond its safe boundary', () => {
    const error = new Error('secret');
    Object.defineProperty(error, 'stack', {
      get: () => {
        throw new Error('private accessor');
      },
    });

    expect(() => ErrorDiagnostics.describe(error)).not.toThrow();
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
