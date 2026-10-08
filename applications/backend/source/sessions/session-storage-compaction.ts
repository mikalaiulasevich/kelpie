import { isUndefined } from 'es-toolkit/predicate';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { SessionSnapshots } from './session-snapshots.js';
import { SessionPolicy } from './session-policy.js';
import { SessionStorageCompactionPolicy } from './session-storage-compaction-policy.js';
import { SessionStorageCompactionMessages } from './session-storage-compaction-messages.js';
import type {
  SessionStorageCompactionOptions,
  SessionStorageCompactionResult,
  SessionStorageCompactionPhase,
  SessionStorageOperationCursor,
  SessionStorageSnapshotMeasurement,
} from './session-storage-compaction-types.js';

const CompactionMeasurements = {
  empty(): SessionStorageCompactionPhase {
    return {
      examined: 0,
      converted: 0,
      alreadyCompact: 0,
      bytesBefore: 0,
      bytesAfter: 0,
      complete: false,
    };
  },

  snapshot(value: Prisma.JsonValue, owner: Parameters<typeof SessionSnapshots.read>[1]) {
    const state = SessionSnapshots.read(value, owner);
    const compact = SessionSnapshots.json(state);

    return {
      compact,
      alreadyCompact: SessionSnapshots.isCompact(value),
      before: Buffer.byteLength(JSON.stringify(value)),
      after: Buffer.byteLength(JSON.stringify(compact)),
    };
  },

  add(
    total: SessionStorageCompactionPhase,
    measurements: ReadonlyList<SessionStorageSnapshotMeasurement>,
  ): SessionStorageCompactionPhase {
    return measurements.reduce(
      (result, item) => ({
        ...result,
        examined: result.examined + 1,
        converted: result.converted + Number(!item.alreadyCompact),
        alreadyCompact: result.alreadyCompact + Number(item.alreadyCompact),
        bytesBefore: result.bytesBefore + item.before,
        bytesAfter: result.bytesAfter + item.after,
      }),
      total,
    );
  },
} as const;

export const SessionStorageCompaction = {
  validate(options: SessionStorageCompactionOptions): void {
    if (
      !Number.isSafeInteger(options.batchSize) ||
      options.batchSize < 1 ||
      options.batchSize > SessionStorageCompactionPolicy.MaximumBatchSize ||
      !Number.isSafeInteger(options.maximumRecords) ||
      options.maximumRecords < 1 ||
      options.maximumRecords > SessionStorageCompactionPolicy.MaximumRecords
    ) {
      throw new Error(SessionStorageCompactionMessages.InvalidOptions);
    }
  },

  async run(
    database: PrismaClient,
    options: SessionStorageCompactionOptions,
  ): Promise<SessionStorageCompactionResult> {
    SessionStorageCompaction.validate(options);
    const operations = await SessionStorageCompaction.operations(database, options);
    const sessions = await SessionStorageCompaction.sessions(database, options);

    return { applied: options.apply, operations, sessions };
  },

  async operations(database: PrismaClient, options: SessionStorageCompactionOptions) {
    let cursor: Optional<SessionStorageOperationCursor> = options.operationCursor;
    let total = CompactionMeasurements.empty();

    while (total.examined < options.maximumRecords) {
      const remaining = options.maximumRecords - total.examined;
      const after = cursor;
      const batch = await database.$transaction(
        async (transaction) => {
          const rows = await transaction.sessionOperation.findMany({
            where: isUndefined(after)
              ? {}
              : {
                  OR: [
                    { sessionIdentifier: { gt: after.sessionIdentifier } },
                    {
                      sessionIdentifier: after.sessionIdentifier,
                      operationIdentifier: { gt: after.operationIdentifier },
                    },
                  ],
                },
            orderBy: [{ sessionIdentifier: 'asc' }, { operationIdentifier: 'asc' }],
            take: Math.min(options.batchSize, remaining),
            include: { session: { include: SessionPolicy.RecordInclude } },
          });
          const measurements = rows.map((row) =>
            CompactionMeasurements.snapshot(row.response, row.session),
          );

          if (options.apply) {
            for (const [index, row] of rows.entries()) {
              const measurement = measurements[index];

              if (!isUndefined(measurement) && !measurement.alreadyCompact) {
                await transaction.sessionOperation.update({
                  where: {
                    sessionIdentifier_operationIdentifier: {
                      sessionIdentifier: row.sessionIdentifier,
                      operationIdentifier: row.operationIdentifier,
                    },
                  },
                  data: { response: measurement.compact },
                });
              }
            }
          }
          const last = rows.at(-1);

          return {
            measurements,
            last: isUndefined(last)
              ? undefined
              : {
                  sessionIdentifier: last.sessionIdentifier,
                  operationIdentifier: last.operationIdentifier,
                },
          };
        },
        { timeout: SessionStorageCompactionPolicy.TransactionTimeoutMilliseconds },
      );
      total = CompactionMeasurements.add(total, batch.measurements);

      if (isUndefined(batch.last)) {
        return { ...total, complete: true, cursor };
      }
      cursor = batch.last;
    }

    return { ...total, cursor };
  },

  async sessions(database: PrismaClient, options: SessionStorageCompactionOptions) {
    let cursor = options.sessionCursor;
    let total = CompactionMeasurements.empty();

    while (total.examined < options.maximumRecords) {
      const remaining = options.maximumRecords - total.examined;
      const after = cursor;
      const batch = await database.$transaction(
        async (transaction) => {
          const rows = await transaction.session.findMany({
            where: {
              initialState: { not: Prisma.AnyNull },
              ...(isUndefined(after) ? {} : { identifier: { gt: after } }),
            },
            orderBy: { identifier: 'asc' },
            take: Math.min(options.batchSize, remaining),
            include: SessionPolicy.RecordInclude,
          });
          const measurements = rows.map((row) =>
            CompactionMeasurements.snapshot(row.initialState, row),
          );

          if (options.apply) {
            for (const [index, row] of rows.entries()) {
              const measurement = measurements[index];

              if (!isUndefined(measurement) && !measurement.alreadyCompact) {
                await transaction.session.update({
                  where: { identifier: row.identifier },
                  data: { initialState: measurement.compact },
                });
              }
            }
          }

          return { measurements, last: rows.at(-1)?.identifier };
        },
        { timeout: SessionStorageCompactionPolicy.TransactionTimeoutMilliseconds },
      );
      total = CompactionMeasurements.add(total, batch.measurements);

      if (isUndefined(batch.last)) {
        return { ...total, complete: true, cursor };
      }
      cursor = batch.last;
    }

    return { ...total, cursor };
  },
} as const;
