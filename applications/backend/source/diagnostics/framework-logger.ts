import type { LoggerService } from '@nestjs/common';
import { isError, isUndefined } from 'es-toolkit/predicate';
import { attempt } from 'es-toolkit/util';
import { Diagnostics } from './diagnostics.js';
import { DiagnosticEvents, DiagnosticSeverity } from './diagnostic-policy.js';
import { ErrorDiagnostics } from './error-diagnostics.js';
import { FrameworkLoggingMessages } from './framework-logging-messages.js';
import { FrameworkLoggingPolicy } from './framework-logging-policy.js';

const FrameworkRecords = {
  write(
    severity: ValueOf<typeof DiagnosticSeverity>,
    message: unknown,
    parameters: ReadonlyList<unknown>,
  ): void {
    const context = FrameworkLoggingPolicy.Contexts.find(
      (candidate) => candidate === parameters.at(-1),
    );
    // Revoked proxies can throw even during instanceof checks; retain only the generic record.
    const [, error] = attempt(() => (isError(message) ? ErrorDiagnostics.describe(message) : null));

    Diagnostics.write(
      {
        event: DiagnosticEvents.FrameworkMessage,
        message: FrameworkLoggingMessages.Recorded,
        ...(isUndefined(context) ? {} : { context }),
        ...(error ? { error } : {}),
      },
      severity,
    );
  },
} as const;

export const FrameworkLogger = {
  log(message: unknown, ...parameters: unknown[]): void {
    FrameworkRecords.write(DiagnosticSeverity.Information, message, parameters);
  },
  error(message: unknown, ...parameters: unknown[]): void {
    FrameworkRecords.write(DiagnosticSeverity.Error, message, parameters);
  },
  warn(message: unknown, ...parameters: unknown[]): void {
    FrameworkRecords.write(DiagnosticSeverity.Warning, message, parameters);
  },
  debug(message: unknown, ...parameters: unknown[]): void {
    FrameworkRecords.write(DiagnosticSeverity.Debug, message, parameters);
  },
  verbose(message: unknown, ...parameters: unknown[]): void {
    FrameworkRecords.write(DiagnosticSeverity.Trace, message, parameters);
  },
  fatal(message: unknown, ...parameters: unknown[]): void {
    FrameworkRecords.write(DiagnosticSeverity.Fatal, message, parameters);
  },
} as const satisfies LoggerService;
