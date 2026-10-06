import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { TransportLog, TransportPolicy } from './transport-policy.js';
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

    return this.resolveInputStatus(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveInputStatus(exception: unknown): Optional<number> {
    // Express body-parser errors are not Nest exceptions. Admit only known
    // input failures; arbitrary error status properties must not cross the boundary.
    if (!(exception instanceof Error) || !('status' in exception)) {
      return undefined;
    }

    return TransportPolicy.InputErrorStatuses.find((status) => status === exception.status);
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
