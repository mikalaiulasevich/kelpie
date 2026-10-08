import { PrismaLibSql } from '@prisma/adapter-libsql';
import type { Client, Config } from '@libsql/client';
import { isUndefined } from 'es-toolkit/predicate';
import type { TrafficSeedSessionGraph } from './traffic-seed-import-types.js';
import { TrafficSeedStatements } from './traffic-seed-statements.js';
import type { TrafficSeedStatement } from './traffic-seed-transport-types.js';
import { TrafficSeedTransportMessages } from './traffic-seed-transport-messages.js';
import { TrafficSeedTransportPolicy } from './traffic-seed-transport-policy.js';

const AtomicRequests = {
  combine(statements: readonly TrafficSeedStatement[]): TrafficSeedStatement[] {
    const combined: TrafficSeedStatement[] = [];

    for (const table of TrafficSeedTransportPolicy.TableNames) {
      const prefix = `INSERT INTO "${table}"`;
      const matching = statements.filter(({ statement }) => statement.sql.startsWith(prefix));
      let pending: TrafficSeedStatement[] = [];
      let bindings = 0;

      for (const statement of matching) {
        if (
          bindings + statement.statement.args.length >
          TrafficSeedTransportPolicy.MaximumBindValues
        ) {
          combined.push(AtomicRequests.merge(pending));
          pending = [];
          bindings = 0;
        }

        pending.push(statement);
        bindings += statement.statement.args.length;
      }

      if (pending.length > 0) {
        combined.push(AtomicRequests.merge(pending));
      }
    }

    return combined;
  },

  merge(statements: readonly TrafficSeedStatement[]): TrafficSeedStatement {
    const first = statements[0];

    if (isUndefined(first)) {
      throw new Error(TrafficSeedTransportMessages.BatchSize);
    }

    const separator = ' VALUES ';
    const prefix = first.statement.sql.slice(
      0,
      first.statement.sql.indexOf(separator) + separator.length,
    );

    return {
      statement: {
        sql:
          prefix +
          statements
            .map(({ statement }) =>
              statement.sql.slice(statement.sql.indexOf(separator) + separator.length),
            )
            .join(','),
        args: statements.flatMap(({ statement }) => statement.args),
      },
      rows: statements.reduce((total, statement) => total + statement.rows, 0),
      // Retaining individual envelopes overestimates the merged request, never underestimates it.
      bytes: statements.reduce((total, statement) => total + statement.bytes, 0),
    };
  },

  prepare(graphs: readonly TrafficSeedSessionGraph[]): TrafficSeedStatement[][] {
    const requests: TrafficSeedStatement[][] = [];
    let pending: TrafficSeedStatement[] = [];
    let bytes = TrafficSeedTransportPolicy.RequestEnvelopeBytes;

    for (const graph of graphs) {
      const statements = TrafficSeedStatements.create([graph]);
      const graphBytes = statements.reduce((total, statement) => total + statement.bytes, 0);

      if (
        graphBytes + TrafficSeedTransportPolicy.RequestEnvelopeBytes >
        TrafficSeedTransportPolicy.MaximumRequestBytes
      ) {
        throw new Error(TrafficSeedTransportMessages.GraphSize);
      }

      if (bytes + graphBytes > TrafficSeedTransportPolicy.MaximumRequestBytes) {
        requests.push(AtomicRequests.combine(pending));
        pending = [];
        bytes = TrafficSeedTransportPolicy.RequestEnvelopeBytes;
      }

      pending.push(...statements);
      bytes += graphBytes;
    }

    if (pending.length > 0) {
      requests.push(AtomicRequests.combine(pending));
    }

    return requests;
  },
} as const;

export class TrafficSeedLibsqlTransport extends PrismaLibSql {
  private client: Optional<Client>;

  override createClient(configuration: Config): Client {
    const client = super.createClient(configuration);
    this.client = client;

    return client;
  }

  prepareGraphs(graphs: readonly TrafficSeedSessionGraph[]): () => Promise<void> {
    // Validate every graph before any commit; each request contains only whole session graphs.
    const requests = AtomicRequests.prepare(graphs);

    return async () => {
      const client = this.client;

      if (isUndefined(client) || client.closed) {
        throw new Error(TrafficSeedTransportMessages.ClientRequired);
      }

      for (const request of requests) {
        const results = await client.batch(
          request.map(({ statement }) => statement),
          TrafficSeedTransportPolicy.TransactionMode,
        );

        if (
          results.length !== request.length ||
          results.some((result, index) => result.rowsAffected !== request[index]?.rows)
        ) {
          throw new Error(TrafficSeedTransportMessages.RowCount);
        }
      }
    };
  }
}
