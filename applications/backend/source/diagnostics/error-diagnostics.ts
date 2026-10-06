import { isError } from 'es-toolkit/predicate';
import { createHash } from 'node:crypto';
import { EnvironmentMessages } from '../environment/environment-messages.js';
import { DiagnosticPolicy, ErrorClassification } from './diagnostic-policy.js';
import type { ErrorDescription, ErrorFrame } from './diagnostics-types.js';

const DiagnosticFingerprint = {
  create(value: string): string {
    return createHash(DiagnosticPolicy.FingerprintAlgorithm)
      .update(value)
      .digest(DiagnosticPolicy.FingerprintEncoding)
      .slice(0, DiagnosticPolicy.FingerprintCharacters);
  },
} as const;

const ErrorDetails = {
  stackLines(error: Error): ReadonlyList<string> {
    const stack = error.stack?.slice(0, DiagnosticPolicy.MaximumStackCharacters) ?? '';

    // V8 includes every line of the error name and message before the call sites.
    // A multiline input must not become a frame or a call-site fingerprint.
    const headerLines =
      ErrorDetails.headerLines(error.name) + ErrorDetails.headerLines(error.message) - 1;

    return stack.split('\n').slice(headerLines, headerLines + DiagnosticPolicy.MaximumFrames);
  },

  headerLines(value: string): number {
    return value.slice(0, DiagnosticPolicy.MaximumStackCharacters).split('\n').length;
  },

  frame(value: string): ReadonlyList<ErrorFrame> {
    const location = DiagnosticPolicy.StackLocationPattern.exec(value);

    if (!location) {
      return [];
    }

    const [, source, line, column] = location;

    return [
      {
        location: DiagnosticFingerprint.create(source ?? ''),
        line: Number(line),
        column: Number(column),
      },
    ];
  },

  code(error: Error): Optional<string> {
    if (!('code' in error)) {
      return undefined;
    }

    return DiagnosticPolicy.ErrorCodes.find((candidate) => candidate === error.code);
  },

  safeMessage(error: Error): Optional<string> {
    return Object.values(EnvironmentMessages).find((message) => message === error.message);
  },
} as const;

const ErrorDescriptions = {
  unknown(fingerprintValue: string): ErrorDescription {
    return {
      classification: ErrorClassification.Unknown,
      safeMessage: undefined,
      code: undefined,
      fingerprint: DiagnosticFingerprint.create(fingerprintValue),
      frames: [],
    };
  },

  known(error: Error): ErrorDescription {
    const stackLines = ErrorDetails.stackLines(error);

    return {
      classification: ErrorClassification.Error,
      safeMessage: ErrorDetails.safeMessage(error),
      code: ErrorDetails.code(error),
      fingerprint: DiagnosticFingerprint.create(stackLines.join('\n')),
      frames: stackLines.flatMap(ErrorDetails.frame),
    };
  },
} as const;

export const ErrorDiagnostics = {
  describe(error: unknown): ErrorDescription {
    try {
      return isError(error) ? ErrorDescriptions.known(error) : ErrorDescriptions.unknown('');
    } catch {
      // Error subclasses may override accessors; diagnostic failures must not escape.
      return ErrorDescriptions.unknown(DiagnosticPolicy.UnreadableErrorFingerprint);
    }
  },
} as const;
