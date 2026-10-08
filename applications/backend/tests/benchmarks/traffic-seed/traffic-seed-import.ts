import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { omit } from 'es-toolkit';
import { isNull, isPlainObject, isUndefined } from 'es-toolkit/predicate';
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js';
import { SessionSnapshots } from '../../../source/sessions/session-snapshots.js';
import { TrafficSeedImportMessages } from './traffic-seed-import-messages.js';
import { TrafficSeedImportPolicy } from './traffic-seed-import-policy.js';
import { TrafficSeedImportRetry } from './traffic-seed-import-retry.js';
import type {
  TrafficSeedImportOptions,
  TrafficSeedImportReceipt,
  TrafficSeedSessionGraph,
  TrafficSeedPreparedRecords,
} from './traffic-seed-import-types.js';

const ImportIdentity = {
  identifier(runIdentifier: string, sourceIdentifier: string): string {
    const digest = createHash('sha256')
      .update(JSON.stringify([runIdentifier, sourceIdentifier]))
      .digest('hex');

    return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  },

  replay(
    response: Prisma.JsonValue,
    owner: TrafficSeedSessionGraph,
    sessionIdentifier: string,
    versionIdentifier: string,
  ): Prisma.JsonValue {
    // Validate the source snapshot against its pinned owner before mapping only owned fields.
    SessionSnapshots.read(response, owner);

    if (!isPlainObject(response) || Array.isArray(response)) {
      throw new Error(TrafficSeedImportMessages.Conflict);
    }

    if (SessionSnapshots.isCompact(response)) {
      const state = response['state'];

      if (!isPlainObject(state) || Array.isArray(state)) {
        throw new Error(TrafficSeedImportMessages.Conflict);
      }

      return { ...response, state: { ...state, sessionIdentifier, versionIdentifier } };
    }

    return { ...response, sessionIdentifier, versionIdentifier };
  },

  input(value: Prisma.JsonValue): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return isNull(value) ? Prisma.JsonNull : value;
  },

  fingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  },

  graph(
    graph: TrafficSeedSessionGraph,
    version: TrafficSeedSessionGraph['version'],
    runIdentifier: string,
    ordinal: number,
  ): TrafficSeedSessionGraph {
    const identifier = ImportIdentity.identifier(runIdentifier, `session:${ordinal}`);

    return {
      ...graph,
      identifier,
      version,
      versionIdentifier: version.identifier,
      accessTokenHash: null,
      initialState: null,
      answers: graph.answers.map((answer) => ({ ...answer, sessionIdentifier: identifier })),
      operations: graph.operations.map((operation) => {
        const response = ImportIdentity.replay(
          operation.response,
          graph,
          identifier,
          version.identifier,
        );

        return {
          ...operation,
          sessionIdentifier: identifier,
          operationIdentifier: ImportIdentity.identifier(
            runIdentifier,
            operation.operationIdentifier,
          ),
          response,
          requestFingerprint: ImportIdentity.fingerprint([operation.requestFingerprint, response]),
        };
      }),
      transitions: graph.transitions.map((transition) => ({
        ...transition,
        identifier: ImportIdentity.identifier(runIdentifier, transition.identifier),
        sessionIdentifier: identifier,
        operationIdentifier: ImportIdentity.identifier(
          runIdentifier,
          transition.operationIdentifier,
        ),
      })),
      events: graph.events.map((event) => {
        const mapped = {
          ...event,
          identifier: ImportIdentity.identifier(runIdentifier, event.identifier),
          sessionIdentifier: identifier,
          properties: event.properties,
        };

        return { ...mapped, contentFingerprint: ImportIdentity.fingerprint(mapped) };
      }),
    };
  },

  comparable(graph: TrafficSeedSessionGraph) {
    return {
      ...omit(graph, ['version']),
      answers: [...graph.answers].sort((left, right) =>
        left.stepIdentifier.localeCompare(right.stepIdentifier),
      ),
      operations: graph.operations
        .map((operation) => ({
          ...operation,
          response: SessionSnapshots.read(operation.response, graph),
        }))
        .sort((left, right) => left.operationIdentifier.localeCompare(right.operationIdentifier)),
      transitions: [...graph.transitions].sort((left, right) =>
        left.identifier.localeCompare(right.identifier),
      ),
      events: [...graph.events].sort((left, right) =>
        left.identifier.localeCompare(right.identifier),
      ),
    };
  },
} as const;

const ImportStorage = {
  async versions(source: PrismaClient, target: PrismaClient) {
    const versions = await source.funnelVersion.findMany({ where: { sessions: { some: {} } } });
    const mapped = new Map<string, TrafficSeedSessionGraph['version']>();

    for (const version of versions) {
      const destination = await target.funnelVersion.findUnique({
        where: {
          funnelIdentifier_version: {
            funnelIdentifier: version.funnelIdentifier,
            version: version.version,
          },
        },
      });

      if (isNull(destination) || destination.checksum !== version.checksum) {
        throw new Error(TrafficSeedImportMessages.MissingVersion);
      }

      mapped.set(version.identifier, destination);
    }

    return mapped;
  },

  prepare(graphs: TrafficSeedSessionGraph[]): TrafficSeedPreparedRecords {
    return {
      sessions: graphs.map((graph) => ({
        ...omit(graph, ['answers', 'operations', 'transitions', 'events', 'version']),
        acquisitionParameters: ImportIdentity.input(graph.acquisitionParameters),
        initialState: Prisma.DbNull,
      })),
      answers: graphs.flatMap((graph) =>
        graph.answers.map((answer) => ({ ...answer, value: ImportIdentity.input(answer.value) })),
      ),
      operations: graphs.flatMap((graph) =>
        graph.operations.map((operation) => ({
          ...operation,
          response: SessionSnapshots.json(SessionSnapshots.read(operation.response, graph)),
        })),
      ),
      transitions: graphs.flatMap((graph) => graph.transitions),
      events: graphs.flatMap((graph) =>
        graph.events.map((event) => ({
          ...event,
          properties: ImportIdentity.input(event.properties),
        })),
      ),
    };
  },

  async persist(transaction: Prisma.TransactionClient, records: TrafficSeedPreparedRecords) {
    await transaction.session.createMany({ data: records.sessions });
    await transaction.sessionAnswer.createMany({ data: records.answers });
    await transaction.sessionOperation.createMany({ data: records.operations });
    await transaction.sessionTransition.createMany({ data: records.transitions });
    await transaction.event.createMany({ data: records.events });
  },

  prepareWriter(
    graphs: TrafficSeedSessionGraph[],
  ): (transaction: Prisma.TransactionClient) => Promise<void> {
    const records = ImportStorage.prepare(graphs);

    return (transaction) => ImportStorage.persist(transaction, records);
  },

  async pending(target: PrismaClient, graphs: TrafficSeedSessionGraph[]) {
    const identifiers = await target.session.findMany({
      where: { identifier: { in: graphs.map((graph) => graph.identifier) } },
      select: { identifier: true },
    });
    const existing =
      identifiers.length === 0
        ? []
        : await target.session.findMany({
            where: { identifier: { in: identifiers.map((record) => record.identifier) } },
            include: TrafficSeedImportPolicy.Include,
          });
    const byIdentifier = new Map(existing.map((graph) => [graph.identifier, graph]));
    const pending: TrafficSeedSessionGraph[] = [];

    for (const graph of graphs) {
      const previous = byIdentifier.get(graph.identifier);

      if (isUndefined(previous)) {
        pending.push(graph);
      } else if (
        !isDeepStrictEqual(ImportIdentity.comparable(previous), ImportIdentity.comparable(graph))
      ) {
        throw new Error(TrafficSeedImportMessages.Conflict);
      }
    }

    return pending;
  },

  async verify(target: PrismaClient, graphs: TrafficSeedSessionGraph[]) {
    const persisted = await target.session.findMany({
      where: { identifier: { in: graphs.map((graph) => graph.identifier) } },
      include: TrafficSeedImportPolicy.Include,
    });
    const byIdentifier = new Map(persisted.map((graph) => [graph.identifier, graph]));

    for (const graph of graphs) {
      const stored = byIdentifier.get(graph.identifier);

      if (
        isUndefined(stored) ||
        !isDeepStrictEqual(ImportIdentity.comparable(stored), ImportIdentity.comparable(graph))
      ) {
        throw new Error(TrafficSeedImportMessages.Conflict);
      }
    }
  },

  async batch(
    target: PrismaClient,
    graphs: TrafficSeedSessionGraph[],
    options: TrafficSeedImportOptions,
  ): Promise<number> {
    const pending = await ImportStorage.pending(target, graphs);

    if (pending.length === 0) {
      return 0;
    }

    if (!isUndefined(options.prepareGraphs)) {
      const commit = options.prepareGraphs(pending);
      await commit();
    } else {
      const write = ImportStorage.prepareWriter(pending);
      await target.$transaction(
        async (transaction) => {
          const concurrent = await transaction.session.findFirst({
            where: { identifier: { in: pending.map((graph) => graph.identifier) } },
            select: { identifier: true },
          });

          if (!isNull(concurrent)) {
            throw new Error(TrafficSeedImportMessages.Conflict);
          }

          await write(transaction);
        },
        { timeout: TrafficSeedImportPolicy.TransactionTimeoutMilliseconds },
      );
    }

    // Committed histories are immutable and credential-free. A transient read failure retries
    // the full preflight, which verifies the committed content instead of inserting it again.
    await ImportStorage.verify(target, pending);

    return pending.length;
  },
} as const;

export const TrafficSeedImport = {
  async run(
    source: PrismaClient,
    target: PrismaClient,
    options: TrafficSeedImportOptions,
  ): Promise<TrafficSeedImportReceipt> {
    if (options.runIdentifier.trim().length === 0) {
      throw new Error(TrafficSeedImportMessages.InvalidRun);
    }

    if ((await source.session.count({ where: { trafficOrigin: { not: 'synthetic' } } })) !== 0) {
      throw new Error(TrafficSeedImportMessages.NonSynthetic);
    }

    const versions = await ImportStorage.versions(source, target);
    const receipt = {
      runIdentifier: options.runIdentifier,
      sessions: 0,
      inserted: 0,
      existing: 0,
      events: 0,
    };
    let cursor: Optional<string>;

    while (true) {
      const records = await source.session.findMany({
        where: isUndefined(cursor) ? {} : { identifier: { gt: cursor } },
        take: TrafficSeedImportPolicy.BatchSize,
        orderBy: { identifier: 'asc' },
        include: TrafficSeedImportPolicy.Include,
      });

      if (records.length === 0) {
        return receipt;
      }

      const graphs = records.map((record, ordinal) => {
        const projected = options.projectSession(record, receipt.sessions + ordinal);
        const version = versions.get(record.versionIdentifier);

        if (isUndefined(version)) {
          throw new Error(TrafficSeedImportMessages.MissingVersion);
        }

        if (
          projected.identifier !== record.identifier ||
          projected.versionIdentifier !== record.versionIdentifier ||
          projected.trafficOrigin !== 'synthetic'
        ) {
          throw new Error(TrafficSeedImportMessages.ProjectionChangedOwner);
        }

        return ImportIdentity.graph(
          projected,
          version,
          options.runIdentifier,
          receipt.sessions + ordinal,
        );
      });
      const inserted = await TrafficSeedImportRetry.run(() =>
        ImportStorage.batch(target, graphs, options),
      );
      receipt.sessions += graphs.length;
      receipt.inserted += inserted;
      receipt.existing += graphs.length - inserted;
      receipt.events += graphs.reduce((count, graph) => count + graph.events.length, 0);
      cursor = records.at(-1)?.identifier;
    }
  },
} as const;
