import { isError } from 'es-toolkit/predicate';
import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../diagnostics/diagnostic-policy.js';
import { ErrorDiagnostics } from '../diagnostics/error-diagnostics.js';
import { TransportPolicy } from './transport-policy.js';
import { TransportMessages } from './transport-messages.js';

@Catch()
export class PublicExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const status = this.resolvePublicStatus(exception);
    const message = this.resolvePublicMessage(status);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      Diagnostics.write({
        event: DiagnosticEvents.RequestFailed,
        status,
        error: ErrorDiagnostics.describe(exception),
      });
    }

    response.status(status).send({ statusCode: status, message });
  }

  private resolvePublicStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return this.resolveInputStatus(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveInputStatus(exception: unknown): Optional<number> {
    // Fastify parser errors are identified by their known codes. Never trust
    // arbitrary status properties from exceptions at the public boundary.
    if (!isError(exception) || !('code' in exception)) {
      return undefined;
    }

    return Object.entries(TransportPolicy.InputErrorCodes).find(
      ([code]) => code === exception.code,
    )?.[1];
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
