import { HttpStatus } from '@nestjs/common';
import { PublicRequestError } from './public-request-error.js';
import { PublicErrorCode } from './transport-policy.js';
import { TransportMessages } from './transport-messages.js';

export const RateLimitResponses = {
  rejected(): PublicRequestError {
    return new PublicRequestError(
      HttpStatus.TOO_MANY_REQUESTS,
      PublicErrorCode.RateLimited,
      TransportMessages.RateLimited,
    );
  },
} as const;
