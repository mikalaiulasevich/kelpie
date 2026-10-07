import { HttpStatus } from '@nestjs/common';
import { isNull } from 'es-toolkit/predicate';
import type { Prisma } from '../../generated/prisma/client.js';
import { PublicRequestError } from '../transport/public-request-error.js';
import { SessionPolicy, SessionErrorCode } from './session-policy.js';
import { SessionMessages } from './session-messages.js';
import type { OwnedSession } from './session-types.js';

export const SessionRecords = {
  async requireOwned(transaction: Prisma.TransactionClient, credentialHash: string): Promise<OwnedSession> {
    const session = await transaction.session.findUnique({ where: { accessTokenHash: credentialHash }, include: SessionPolicy.RecordInclude });
    if (isNull(session) || session.expiresAt.getTime() <= Date.now()) {
      throw new PublicRequestError(HttpStatus.UNAUTHORIZED, SessionErrorCode.Unauthorized, SessionMessages.Unauthorized);
    }

    return session;
  },
} as const;
