import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { TransportMessages } from './transport-messages.js';

function resolvePublicStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  // Express body-parser errors are not Nest exceptions, but input limits still
  // need a client error rather than an internal failure.
  if (
    exception instanceof Error &&
    'status' in exception &&
    (exception.status === HttpStatus.PAYLOAD_TOO_LARGE ||
      exception.status === HttpStatus.BAD_REQUEST)
  ) {
    return exception.status;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function resolvePublicMessage(status: number): string {
  if (status === HttpStatus.SERVICE_UNAVAILABLE) {
    return TransportMessages.NotReady;
  }

  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return TransportMessages.InternalFailure;
  }

  if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
    return TransportMessages.BodyTooLarge;
  }

  return TransportMessages.RequestRejected;
}

@Catch()
export class PublicExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = resolvePublicStatus(exception);
    const message = resolvePublicMessage(status);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      process.stderr.write(
        `${JSON.stringify({ level: 'error', component: 'request', message: TransportMessages.UnhandledFailure })}\n`,
      );
    }

    response.status(status).json({ statusCode: status, message });
  }
}
