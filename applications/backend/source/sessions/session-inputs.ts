import { SessionTimestamps } from './session-timestamps.js';
import { Ajv } from 'ajv';
import { HttpStatus } from '@nestjs/common';
import { pick } from 'es-toolkit/object';
import { PublicRequestError } from '../transport/public-request-error.js';
import { SessionSchemas, type CreateSessionRequest, type SessionQuery } from './session-types.js';
import { SessionPolicy, SessionErrorCode } from './session-policy.js';
import { SessionMessages } from './session-messages.js';

const compiler = new Ajv({ strict: true, ownProperties: true });
const validators = {
  create: compiler.compile<CreateSessionRequest>(SessionSchemas.Create),
  query: compiler.compile<SessionQuery>(SessionSchemas.Query),
} as const;

export const SessionInputs = {
  create(body: unknown): CreateSessionRequest {
    if (!validators.create(body) || !SessionTimestamps.isCanonical(body.clientTimestamp)) {
      throw new PublicRequestError(
        HttpStatus.BAD_REQUEST,
        SessionErrorCode.Invalid,
        SessionMessages.Invalid,
      );
    }

    return { ...body };
  },

  query(value: unknown): SessionQuery {
    if (!validators.query(value)) {
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
