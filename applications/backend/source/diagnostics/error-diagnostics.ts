import { EnvironmentMessages } from '../environment/environment-messages.js';
import { createHash } from 'node:crypto';
import { DiagnosticPolicy, ErrorClassification } from './diagnostic-policy.js';

import type { ErrorDescription } from './diagnostics-types.js';

export const ErrorDiagnostics = {
  fingerprint(value: string): string {
    return createHash('sha256')
      .update(value)
      .digest('hex')
      .slice(0, DiagnosticPolicy.FingerprintCharacters);
  },
  describe(error: unknown): ErrorDescription {
    try {
      return this.inspect(error);
    } catch {
      // Error subclasses can override stack/code accessors; diagnostics cannot trust them.
      return {
        classification: ErrorClassification.Unknown,
        safeMessage: undefined,
        code: undefined,
        fingerprint: this.fingerprint('unreadable'),
        frames: [],
      };
    }
  },
  inspect(error: unknown): ErrorDescription {
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

    const safeMessage =
      error instanceof Error
        ? Object.values(EnvironmentMessages).find((message) => message === error.message)
        : undefined;

    return {
      safeMessage,
      classification:
        error instanceof Error ? ErrorClassification.Error : ErrorClassification.Unknown,
      code,
      fingerprint: this.fingerprint(stackLines.join('\n')),
      frames,
    };
  },
} as const;
