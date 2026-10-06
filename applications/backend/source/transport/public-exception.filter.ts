import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

function resolvePublicStatus(exception: unknown): number {
  if (exception instanceof HttpException) return exception.getStatus();
  // Express body-parser errors are not Nest exceptions, but input limits still
  // need a client error rather than an internal failure.
  if (exception instanceof Error && 'status' in exception && exception.status === 413) {
    return HttpStatus.PAYLOAD_TOO_LARGE;
  }
  if (exception instanceof Error && 'status' in exception && exception.status === 400) {
    return HttpStatus.BAD_REQUEST;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

@Catch()
export class PublicExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = resolvePublicStatus(exception);
    const message =
      status >= 500
        ? status === HttpStatus.SERVICE_UNAVAILABLE
          ? 'Application is not ready.'
          : 'An internal error occurred.'
        : status === HttpStatus.PAYLOAD_TOO_LARGE
          ? 'Request body is too large.'
          : 'Request could not be processed.';
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      process.stderr.write(
        `${JSON.stringify({ level: 'error', component: 'request', message: 'Unhandled request failure.' })}\n`,
      );
    }
    response.status(status).json({ statusCode: status, message });
  }
}
