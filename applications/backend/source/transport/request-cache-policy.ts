import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { TransportPolicy } from './transport-policy.js';

export const RequestCachePolicy = {
  isPrivate(url: string): boolean {
    return TransportPolicy.PrivateRoutePrefixes.some((prefix) => url.startsWith(prefix));
  },

  onRequest(request: FastifyRequest, reply: FastifyReply, next: HookHandlerDoneFunction): void {
    if (RequestCachePolicy.isPrivate(request.url)) {
      reply.header(TransportPolicy.CacheControlHeader, TransportPolicy.PrivateCacheControl);
    }

    next();
  },
} as const;
