import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { TransportLog } from './transport-policy.js';
import { TransportMessages } from './transport-messages.js';

@Catch()
export class PublicExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.resolvePublicStatus(exception);
    const message = this.resolvePublicMessage(status);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      process.stderr.write(
        `${JSON.stringify({ level: TransportLog.ErrorLevel, component: TransportLog.RequestComponent, message: TransportMessages.UnhandledFailure })}\n`,
      );
    }

    response.status(status).json({ statusCode: status, message });
  }
  private resolvePublicStatus(exception: unknown): number {
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
