import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { AdministrationPolicy } from '../administration/administration-policy.js';
import { TransportPolicy } from './transport-policy.js';

export const RequestCachePolicy = {
  onRequest(request: FastifyRequest, reply: FastifyReply, next: HookHandlerDoneFunction): void {
    if (request.url.startsWith(AdministrationPolicy.CookiePath)) {
      reply.header(TransportPolicy.CacheControlHeader, TransportPolicy.PrivateCacheControl);
    }

    next();
  },
} as const;
