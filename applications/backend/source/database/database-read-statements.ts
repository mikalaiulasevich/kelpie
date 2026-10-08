import type { InStatement, InValue, ResultSet } from '@libsql/client';
import { isBoolean, isNull, isString, isUndefined } from 'es-toolkit/predicate';
import type { Prisma } from '../../generated/prisma/client.js';
import { DatabaseReadMessages } from './database-read-messages.js';
import { DatabaseReadPolicy } from './database-read-policy.js';

const ReadBindings = {
  value(value: unknown): InValue {
    if (isNull(value) || isString(value) || typeof value === 'bigint') {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (isBoolean(value)) {
      return Number(value);
    }

    if (value instanceof Date && Number.isFinite(value.getTime())) {
      // Match the operational Prisma SQLite adapter's ISO timestamp storage.
      return value.toISOString().replace('Z', '+00:00');
    }

    if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
      return value;
    }

    throw new Error(DatabaseReadMessages.InvalidBinding);
  },

  bytes(value: InValue): number {
    if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
      return Math.ceil(value.byteLength / 3) * 4;
    }

    return Buffer.byteLength(JSON.stringify(typeof value === 'bigint' ? value.toString() : value));
  },
} as const;

export const DatabaseReadStatements = {
  EnableReadOnlyConnection: 'PRAGMA query_only = ON',

  prepare(statements: readonly Prisma.Sql[]): InStatement[] {
    if (statements.length > DatabaseReadPolicy.MaximumStatements) {
      throw new Error(DatabaseReadMessages.InvalidStatement);
    }

    let bytes = DatabaseReadPolicy.RequestEnvelopeBytes;

    return statements.map((statement) => {
      if (
        !DatabaseReadPolicy.SelectPrefix.test(statement.sql) ||
        statement.values.length > DatabaseReadPolicy.MaximumBindingsPerStatement
      ) {
        throw new Error(DatabaseReadMessages.InvalidStatement);
      }

      const args = statement.values.map((value: unknown) => ReadBindings.value(value));
      bytes +=
        Buffer.byteLength(JSON.stringify(statement.sql)) +
        DatabaseReadPolicy.StatementEnvelopeBytes;

      for (const argument of args) {
        bytes += ReadBindings.bytes(argument) + DatabaseReadPolicy.ArgumentEnvelopeBytes;
      }

      if (bytes > DatabaseReadPolicy.MaximumRequestBytes) {
        throw new Error(DatabaseReadMessages.InvalidStatement);
      }

      return { sql: statement.sql, args };
    });
  },

  rows(result: ResultSet): unknown[] {
    if (new Set(result.columns).size !== result.columns.length) {
      throw new Error(DatabaseReadMessages.InvalidResult);
    }

    return result.rows.map((row) =>
      Object.fromEntries(
        result.columns.map((column, index) => {
          const value = row[index];

          if (isUndefined(value)) {
            throw new Error(DatabaseReadMessages.InvalidResult);
          }

          return [column, value];
        }),
      ),
    );
  },
} as const;
