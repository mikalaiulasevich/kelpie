import { isString } from 'es-toolkit/predicate';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { DiagnosticEvents, DiagnosticPolicy } from './diagnostic-policy.js';
import { Diagnostics, RequestContext } from './diagnostics.js';

export const RequestDiagnostics = {
  middleware(request: Request, response: Response, next: NextFunction): void {
    const requestIdentifier = randomUUID();
    const started = performance.now();
    const method =
      DiagnosticPolicy.Methods.find((candidate) => candidate === request.method) ??
      DiagnosticPolicy.UnknownMethod;
    let recorded = false;
    response.setHeader(DiagnosticPolicy.RequestIdentifierHeader, requestIdentifier);

    const complete = (): void => {
      if (recorded) {
        return;
      }

      recorded = true;
      // Express route.path is the registered template, never the incoming URL.
      const route: unknown = request.route?.path;
      Diagnostics.write({
        event: response.writableFinished
          ? DiagnosticEvents.RequestCompleted
          : DiagnosticEvents.RequestAborted,
        requestIdentifier,
        method,
        route: isString(route) ? route : DiagnosticPolicy.UnmatchedRoute,
        status: response.statusCode,
        durationMilliseconds: Math.round(performance.now() - started),
      });
    };

    response.once('finish', complete);
    response.once('close', complete);
    RequestContext.run({ requestIdentifier }, next);
  },
} as const;
