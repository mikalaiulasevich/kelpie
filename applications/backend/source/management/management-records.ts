import { NotFoundException } from '@nestjs/common';
import { isNull } from 'es-toolkit/predicate';
import type { Prisma } from '../../generated/prisma/client.js';
import { ManagementMessages } from './management-messages.js';
import { ManagementPolicy } from './management-policy.js';
import type { FunnelReference, ManagementPage, ManagementQuery } from './management-types.js';

export const ManagementRecords = {
  async readFunnel(transaction: Prisma.TransactionClient, identifier: string): Promise<FunnelReference> {
    const funnel = await transaction.funnel.findUnique({
      where: { identifier },
      select: ManagementPolicy.FunnelSelection,
    });

    if (isNull(funnel)) {
      throw new NotFoundException(ManagementMessages.MissingFunnel);
    }

    return funnel;
  },

  page<Item>(items: ReadonlyList<Item>, query: ManagementQuery): ManagementPage<Item> {
    return {
      items: items.slice(0, query.limit),
      nextOffset: items.length > query.limit ? query.offset + query.limit : null,
    };
  },
} as const;
