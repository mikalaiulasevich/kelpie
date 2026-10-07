import { DatabaseErrors } from '../database/database-errors.js';
import { isError, isString } from 'es-toolkit/predicate';
import { attempt } from 'es-toolkit/util';
import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { randomUUID } from 'node:crypto';
import { PublicRequestError } from './public-request-error.js';
import { DiagnosticPolicy } from '../diagnostics/diagnostic-policy.js';
import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../diagnostics/diagnostic-policy.js';
import { ErrorDiagnostics } from '../diagnostics/error-diagnostics.js';
import { TransportPolicy, PublicStatusCodes, PublicErrorCode } from './transport-policy.js';
import { TransportMessages } from './transport-messages.js';

const inputErrorStatuses = new Map<string, number>(Object.entries(TransportPolicy.InputErrorCodes));

@Catch()
export class PublicExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const status = this.resolvePublicStatus(exception);
    const domainError = exception instanceof PublicRequestError ? exception : undefined;
    const message = domainError?.message ?? this.resolvePublicMessage(status);
    const requestIdentifier =
      response.raw.getHeader(DiagnosticPolicy.RequestIdentifierHeader) ?? randomUUID();
    response.header(DiagnosticPolicy.RequestIdentifierHeader, requestIdentifier);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Diagnostics.write({
        event: DiagnosticEvents.RequestFailed,
        status,
        error: ErrorDiagnostics.describe(exception),
      });
    }

    if (DatabaseErrors.isUnavailable(exception)) {
      response.header(TransportPolicy.RetryAfterHeader, TransportPolicy.StorageRetryAfterSeconds);
    }

    response.status(status).send({
      statusCode: status,
      code: domainError?.code ?? PublicStatusCodes[status] ?? PublicErrorCode.Internal,
      message,
      requestIdentifier,
      ...(domainError?.issues
        ? { issues: domainError.issues.slice(0, TransportPolicy.MaximumPublicIssues) }
        : {}),
    });
  }

  private resolvePublicStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (DatabaseErrors.isUnavailable(exception)) {
      return HttpStatus.SERVICE_UNAVAILABLE;
    }

    return this.resolveInputStatus(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveInputStatus(exception: unknown): Optional<number> {
    // Fastify parser errors are identified by their known codes. Never trust
    // arbitrary status properties from exceptions at the public boundary.
    const [, code] = attempt(() => {
      if (!isError(exception) || !('code' in exception)) {
        return undefined;
      }

      return exception.code;
    });

    return isString(code) ? inputErrorStatuses.get(code) : undefined;
  }

  private resolvePublicMessage(status: number): string {
    switch (status) {
      case HttpStatus.SERVICE_UNAVAILABLE:
        return TransportMessages.NotReady;
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return TransportMessages.BodyTooLarge;
      default:
        return status >= HttpStatus.INTERNAL_SERVER_ERROR
          ? TransportMessages.InternalFailure
          : TransportMessages.RequestRejected;
    }
  }
}
