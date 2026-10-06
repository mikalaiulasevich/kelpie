import { isError, isUndefined } from 'es-toolkit/predicate';
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

    const header = ErrorDetails.header(error);

    // A cached stack can predate changes to name/message. If its full header cannot
    // be verified, omit locations rather than interpreting old private text as frames.
    if (isUndefined(header) || !stack.startsWith(`${header}\n`)) {
      return [];
    }

    return stack
      .slice(header.length + '\n'.length)
      .split('\n')
      .slice(0, DiagnosticPolicy.MaximumFrames);
  },

  header(error: Error): Optional<string> {
    const { name, message } = error;

    if (name.length + message.length > DiagnosticPolicy.MaximumStackCharacters) {
      return undefined;
    }

    if (name.length === 0) {
      return message;
    }

    if (message.length === 0) {
      return name;
    }

    return `${name}: ${message}`;
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
