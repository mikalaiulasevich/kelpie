import { SessionTimestamps } from './session-timestamps.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { HttpStatus } from '@nestjs/common';
import { pick } from 'es-toolkit/object';
import { PublicRequestError } from '../transport/public-request-error.js';
import { SessionSchemas, type CreateSessionRequest, type SessionQuery } from './session-types.js';
import { SessionPolicy, SessionErrorCode } from './session-policy.js';
import { SessionMessages } from './session-messages.js';

const SessionValidators = {
  create: SchemaCompiler.compile<CreateSessionRequest>(SessionSchemas.Create),
  query: SchemaCompiler.compile<SessionQuery>(SessionSchemas.Query),
} as const;

export const SessionInputs = {
  create(body: unknown): CreateSessionRequest {
    if (!SessionValidators.create(body) || !SessionTimestamps.isCanonical(body.clientTimestamp)) {
      throw new PublicRequestError(
        HttpStatus.BAD_REQUEST,
        SessionErrorCode.Invalid,
        SessionMessages.Invalid,
      );
    }

    return { ...body };
  },

  query(value: unknown): SessionQuery {
    if (!SessionValidators.query(value)) {
      throw new PublicRequestError(
        HttpStatus.BAD_REQUEST,
        SessionErrorCode.Invalid,
        SessionMessages.Invalid,
      );
    }

    return { ...value };
  },

  acquisition(query: SessionQuery): SessionQuery {
    return pick(query, SessionPolicy.AcquisitionFields);
  },
} as const;
