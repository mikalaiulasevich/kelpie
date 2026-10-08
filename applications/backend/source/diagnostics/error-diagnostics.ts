import { isError } from 'es-toolkit/predicate';
import { createHash } from 'node:crypto';
import { EnvironmentMessages } from '../environment/environment-messages.js';
import {
  DiagnosticPolicy,
  ErrorClassification,
  DiagnosticFailureCategory,
} from './diagnostic-policy.js';
import type { ErrorDescription, ErrorFrame } from './diagnostics-types.js';
import { DatabaseErrors } from '../database/database-errors.js';
import { DatabaseFailureKind } from '../database/database-failure-policy.js';

const databaseCategories = {
  [DatabaseFailureKind.OperationTimeout]: DiagnosticFailureCategory.DatabaseOperationTimeout,
  [DatabaseFailureKind.TransactionExpired]: DiagnosticFailureCategory.DatabaseTransactionExpired,
  [DatabaseFailureKind.TransactionAcquisitionTimeout]:
    DiagnosticFailureCategory.DatabaseTransactionAcquisitionTimeout,
  [DatabaseFailureKind.TransactionFailure]: DiagnosticFailureCategory.DatabaseTransactionFailure,
  [DatabaseFailureKind.TransportTimeout]: DiagnosticFailureCategory.DatabaseTransportTimeout,
  [DatabaseFailureKind.TransportClosed]: DiagnosticFailureCategory.DatabaseTransportClosed,
} as const;

const DiagnosticFingerprint = {
  create(value: string): string {
    return createHash(DiagnosticPolicy.FingerprintAlgorithm)
      .update(value)
      .digest(DiagnosticPolicy.FingerprintEncoding)
      .slice(0, DiagnosticPolicy.FingerprintCharacters);
  },
} as const;

const ErrorReportingSite = {
  stackLines(stack: string): ReadonlyList<string> {
    // Only a fresh server-owned Error reaches this parser, never the reported error.
    return stack
      .slice(0, DiagnosticPolicy.MaximumStackCharacters)
      .split('\n')
      .slice(1, DiagnosticPolicy.MaximumFrames + 1);
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
} as const;

const allowedMessages = Object.values(EnvironmentMessages);

const ErrorDetails = {
  code(error: Error): Optional<string> {
    if (!('code' in error)) {
      return undefined;
    }

    const code: unknown = error.code;

    return DiagnosticPolicy.ErrorCodes.find((candidate) => candidate === code);
  },

  safeMessage(error: Error): Optional<string> {
    const message = error.message;

    return allowedMessages.find((candidate) => candidate === message);
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

  known(error: Error, reportingStack: string): ErrorDescription {
    const stackLines = ErrorReportingSite.stackLines(reportingStack);
    const failure = DatabaseErrors.describe(error);
    const category = failure ? databaseCategories[failure.kind] : undefined;
    const code = failure?.code ?? ErrorDetails.code(error);

    return {
      classification: ErrorClassification.Error,
      ...(category ? { category } : {}),
      safeMessage: ErrorDetails.safeMessage(error),
      code,
      fingerprint: DiagnosticFingerprint.create(JSON.stringify([category, code, stackLines])),
      frames: stackLines.flatMap(ErrorReportingSite.frame),
    };
  },
} as const;

export const ErrorDiagnostics = {
  describe(error: unknown): ErrorDescription {
    try {
      const reportingStack = new Error().stack ?? '';

      return isError(error)
        ? ErrorDescriptions.known(error, reportingStack)
        : ErrorDescriptions.unknown('');
    } catch {
      // Error subclasses may override accessors; diagnostic failures must not escape.
      return ErrorDescriptions.unknown(DiagnosticPolicy.UnreadableErrorFingerprint);
    }
  },
} as const;
