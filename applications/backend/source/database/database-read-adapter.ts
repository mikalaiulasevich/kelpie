import { PrismaLibSql } from '@prisma/adapter-libsql';
import type { Client, Config, Transaction } from '@libsql/client';
import { isUndefined } from 'es-toolkit/predicate';
import type { DatabaseReadQuery } from './database-read-types.js';
import { DatabaseReadPolicy } from './database-read-policy.js';
import { DatabaseReadMessages } from './database-read-messages.js';
import { DatabaseReadStatements } from './database-read-statements.js';

export class DatabaseReadAdapter extends PrismaLibSql {
  private activeTransaction: Optional<Transaction>;

  private transactionAcquisition: Optional<Promise<Transaction>>;

  override createClient(configuration: Config): Client {
    const client = super.createClient({ ...configuration, intMode: 'bigint' });
    const acquire = client.transaction.bind(client);
    client.transaction = async () => {
      if (
        !isUndefined(this.transactionAcquisition) ||
        (!isUndefined(this.activeTransaction) && !this.activeTransaction.closed)
      ) {
        throw new Error(DatabaseReadMessages.ConcurrentSnapshot);
      }

      // Reserve acquisition synchronously; concurrent callers must not replace snapshot ownership.
      const acquisition = acquire(DatabaseReadPolicy.TransactionMode);
      this.transactionAcquisition = acquisition;

      try {
        const transaction = await acquisition;
        this.activeTransaction = transaction;

        return transaction;
      } finally {
        this.transactionAcquisition = undefined;
      }
    };

    return client;
  }

  queries(): DatabaseReadQuery {
    const transaction = this.activeTransaction;

    if (isUndefined(transaction) || transaction.closed) {
      throw new Error(DatabaseReadMessages.SnapshotRequired);
    }

    // Capture this exact owner so an escaped callback cannot read a later caller's snapshot.
    return async (statements) => {
      if (transaction.closed) {
        throw new Error(DatabaseReadMessages.SnapshotRequired);
      }

      const prepared = DatabaseReadStatements.prepare(statements);

      if (prepared.length === 0) {
        return [];
      }

      const results = await transaction.batch(prepared);

      if (results.length !== statements.length) {
        throw new Error(DatabaseReadMessages.InvalidResult);
      }

      return results.map((result) => DatabaseReadStatements.rows(result));
    };
  }
}
