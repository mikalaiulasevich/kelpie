import { SessionSnapshots } from '../../../source/sessions/session-snapshots.js';
import type { TrafficSeedSessionGraph } from './traffic-seed-import-types.js';
import { TrafficSeedTransportPolicy } from './traffic-seed-transport-policy.js';
import { TrafficSeedTransportMessages } from './traffic-seed-transport-messages.js';
import type { TrafficSeedStatement } from './traffic-seed-transport-types.js';

type SeedStatementValue = TextOrNumber | null;

const SeedStatementData = {
  timestamp(value: Date): string {
    // Match PrismaLibSql's default ISO timestamp serialization for exact replay comparisons.
    return value.toISOString().replace('Z', '+00:00');
  },

  tables(
    graphs: readonly TrafficSeedSessionGraph[],
  ): Record<keyof typeof TrafficSeedTransportPolicy.Tables, SeedStatementValue[][]> {
    return {
      Session: graphs.map((graph) => [
        graph.identifier,
        null,
        graph.versionIdentifier,
        graph.experimentIdentifier,
        graph.variant,
        graph.assignmentSource,
        graph.trafficOrigin,
        JSON.stringify(graph.acquisitionParameters),
        graph.campaign,
        graph.currentStepIdentifier,
        graph.revision,
        null,
        SeedStatementData.timestamp(graph.createdAt),
        SeedStatementData.timestamp(graph.expiresAt),
      ]),
      SessionAnswer: graphs.flatMap((graph) =>
        graph.answers.map((answer) => [
          answer.sessionIdentifier,
          answer.stepIdentifier,
          JSON.stringify(answer.value),
          answer.confirmationRevision,
          SeedStatementData.timestamp(answer.updatedAt),
        ]),
      ),
      SessionOperation: graphs.flatMap((graph) =>
        graph.operations.map((operation) => [
          operation.operationIdentifier,
          operation.sessionIdentifier,
          operation.requestFingerprint,
          JSON.stringify(SessionSnapshots.json(SessionSnapshots.read(operation.response, graph))),
          SeedStatementData.timestamp(operation.createdAt),
        ]),
      ),
      SessionTransition: graphs.flatMap((graph) =>
        graph.transitions.map((transition) => [
          transition.identifier,
          transition.sessionIdentifier,
          transition.operationIdentifier,
          transition.revision,
          transition.kind,
          transition.fromStepIdentifier,
          transition.toStepIdentifier,
          SeedStatementData.timestamp(transition.createdAt),
        ]),
      ),
      Event: graphs.flatMap((graph) =>
        graph.events.map((event) => [
          event.identifier,
          event.contentFingerprint,
          event.sessionIdentifier,
          event.name,
          event.source,
          SeedStatementData.timestamp(event.clientTimestamp),
          SeedStatementData.timestamp(event.serverTimestamp),
          event.stepIdentifier,
          event.observationRevision,
          JSON.stringify(event.properties),
        ]),
      ),
    };
  },
} as const;

const StatementGroups = {
  complete(
    prefix: string,
    placeholders: string,
    rows: SeedStatementValue[][],
    bytes: number,
  ): TrafficSeedStatement {
    return {
      statement: { sql: prefix + rows.map(() => placeholders).join(','), args: rows.flat() },
      rows: rows.length,
      bytes,
    };
  },
} as const;

export const TrafficSeedStatements = {
  create(
    graphs: readonly TrafficSeedSessionGraph[],
    maximumBindValues: number = TrafficSeedTransportPolicy.MaximumBindValues,
  ): TrafficSeedStatement[] {
    if (
      !Number.isInteger(maximumBindValues) ||
      maximumBindValues < 1 ||
      maximumBindValues > TrafficSeedTransportPolicy.MaximumBindValues
    ) {
      throw new Error(TrafficSeedTransportMessages.BatchSize);
    }

    const tables = SeedStatementData.tables(graphs);
    const statements: TrafficSeedStatement[] = [];

    for (const table of TrafficSeedTransportPolicy.TableNames) {
      const columns = TrafficSeedTransportPolicy.Tables[table];
      const rows = tables[table];
      // Table names and columns come exclusively from this static catalog; values are always bound.
      const prefix = `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(',')}) VALUES `;
      const placeholders = `(${columns.map(() => '?').join(',')})`;

      const baseBytes =
        Buffer.byteLength(JSON.stringify({ sql: prefix, args: [] })) +
        TrafficSeedTransportPolicy.StatementEnvelopeBytes;
      let group: SeedStatementValue[][] = [];
      let bytes = baseBytes;

      for (const row of rows) {
        // Encode each row exactly once. Removing JSON array brackets leaves the argument bytes;
        // subsequent rows add one SQL comma and one argument comma. Hrana metadata is bounded
        // separately, avoiding repeated serialization of a growing statement.
        const rowBytes =
          Buffer.byteLength(JSON.stringify(row)) -
          2 +
          placeholders.length +
          row.length * TrafficSeedTransportPolicy.ArgumentEnvelopeBytes;

        if (
          row.length > maximumBindValues ||
          baseBytes + rowBytes + TrafficSeedTransportPolicy.RequestEnvelopeBytes >
            TrafficSeedTransportPolicy.MaximumRequestBytes
        ) {
          throw new Error(TrafficSeedTransportMessages.BatchSize);
        }

        if (
          group.length > 0 &&
          ((group.length + 1) * columns.length > maximumBindValues ||
            bytes + rowBytes + 2 + TrafficSeedTransportPolicy.RequestEnvelopeBytes >
              TrafficSeedTransportPolicy.MaximumRequestBytes)
        ) {
          statements.push(StatementGroups.complete(prefix, placeholders, group, bytes));
          group = [];
          bytes = baseBytes;
        }

        bytes += rowBytes + (group.length === 0 ? 0 : 2);
        group.push(row);
      }

      if (group.length > 0) {
        statements.push(StatementGroups.complete(prefix, placeholders, group, bytes));
      }
    }

    return statements;
  },
} as const;
