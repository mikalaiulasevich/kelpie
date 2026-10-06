import { createHash } from 'node:crypto';
import { DiagnosticPolicy } from './diagnostic-policy.js';

export interface ErrorDescription {
  readonly classification: 'error' | 'unknown';
  readonly code: Optional<string>;
  readonly fingerprint: string;
  readonly frames: ReadonlyList<Readonly<{ location: string; line: number; column: number }>>;
}

export const ErrorDiagnostics = {
  fingerprint(value: string): string {
    return createHash('sha256')
      .update(value)
      .digest('hex')
      .slice(0, DiagnosticPolicy.FingerprintCharacters);
  },
  describe(error: unknown): ErrorDescription {
    const stack =
      error instanceof Error
        ? (error.stack?.slice(0, DiagnosticPolicy.MaximumStackCharacters) ?? '')
        : '';
    // Exclude the first line: it contains the error message and may hold credentials.
    const stackLines = stack.split('\n').slice(1, DiagnosticPolicy.MaximumFrames + 1);
    const frames = stackLines.flatMap((frame) => {
      const location = /(.+):(\d+):(\d+)\)?$/.exec(frame);

      if (!location) {
        return [];
      }

      return [
        {
          location: this.fingerprint(location[1] ?? ''),
          line: Number(location[2]),
          column: Number(location[3]),
        },
      ];
    });
    const code =
      error instanceof Error && 'code' in error
        ? DiagnosticPolicy.ErrorCodes.find((candidate) => candidate === error.code)
        : undefined;

    return {
      classification: error instanceof Error ? 'error' : 'unknown',
      code,
      fingerprint: this.fingerprint(stackLines.join('\n')),
      frames,
    };
  },
} as const;
