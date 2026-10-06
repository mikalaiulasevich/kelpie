import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import { isNull, isString, isUndefined } from 'es-toolkit/predicate';
import type {
  FastifyBodyParser,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify';

import { TransportMessages } from './transport-messages.js';
import { TransportPolicy } from './transport-policy.js';

export const RequestBodyPolicy = {
  validate(request: FastifyRequest, _reply: FastifyReply, done: HookHandlerDoneFunction): void {
    const encoding = request.headers['content-encoding'];
    const contentType = request.headers['content-type'] ?? '';
    const supportedEncoding =
      isUndefined(encoding) ||
      (isString(encoding) && encoding.toLowerCase() === TransportPolicy.IdentityEncoding);
    const supportedCharset = [...contentType.matchAll(TransportPolicy.CharsetPattern)].every(
      (match) => (match[1] ?? match[2] ?? '').trim().toLowerCase() === TransportPolicy.Utf8Charset,
    );

    if (!supportedEncoding || !supportedCharset) {
      done(new UnsupportedMediaTypeException(TransportMessages.RequestRejected));

      return;
    }

    done();
  },

  parser(server: FastifyInstance): FastifyBodyParser<string> {
    const parse = server.getDefaultJsonParser(
      TransportPolicy.PrototypePoisoning,
      TransportPolicy.ConstructorPoisoning,
    );

    return (request, body, done): void => {
      void parse(request, body, (error: Error | null, value: unknown) => {
        if (!isNull(error) || isNull(value) || typeof value !== 'object') {
          done(new BadRequestException(TransportMessages.RequestRejected));

          return;
        }

        done(null, value);
      });
    };
  },
} as const;
