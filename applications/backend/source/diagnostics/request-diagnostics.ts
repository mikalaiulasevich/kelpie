import { once } from 'es-toolkit/function';
import { isString } from 'es-toolkit/predicate';
import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { DiagnosticEvents, DiagnosticPolicy } from './diagnostic-policy.js';
import { Diagnostics, RequestContext } from './diagnostics.js';

export const RequestDiagnostics = {
  onRequest(request: FastifyRequest, reply: FastifyReply, next: HookHandlerDoneFunction): void {
    const response = reply.raw;
    const requestIdentifier = randomUUID();
    const started = performance.now();
    const method =
      DiagnosticPolicy.Methods.find((candidate) => candidate === request.method) ??
      DiagnosticPolicy.UnknownMethod;
    response.setHeader(DiagnosticPolicy.RequestIdentifierHeader, requestIdentifier);

    const complete = once((): void => {
      // Fastify routeOptions.url is the registered template, never the incoming URL.
      const route: unknown = request.routeOptions.url;
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
    });

    response.once('finish', complete);
    response.once('close', complete);
    RequestContext.run({ requestIdentifier }, next);
  },
} as const;
