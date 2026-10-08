import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { isUndefined } from 'es-toolkit/predicate';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ApplicationEnvironmentService } from '../environment/application-environment.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { DatabaseAdapters } from './database-adapters.js';
import { DatabaseReadAdapter } from './database-read-adapter.js';
import { DatabaseReadMessages } from './database-read-messages.js';
import { DatabaseReadPolicy } from './database-read-policy.js';
import { DatabaseReadStatements } from './database-read-statements.js';
import {
  DatabaseReadOptionsSchema,
  type DatabaseReadOptions,
  type DatabaseReadSnapshot,
} from './database-read-types.js';
import { RemoteDatabaseRequests } from './remote-database-requests.js';
import { SQLiteFiles } from './sqlite-files.js';
import { SQLitePolicy } from './sqlite-policy.js';
import { SQLiteStatements } from './sqlite-statements.js';

const ReadValidation = {
  options: SchemaCompiler.compile<DatabaseReadOptions>(DatabaseReadOptionsSchema),
} as const;

@Injectable()
export class DatabaseReadService implements OnModuleInit, OnApplicationShutdown {
  readonly client: PrismaClient;

  private readonly nativeAdapter: Optional<DatabaseReadAdapter>;

  private readonly databaseUrl: string;

  private acceptingReads = false;

  constructor(@Inject(ApplicationEnvironmentService) environment: ApplicationEnvironmentService) {
    this.databaseUrl = environment.values.databaseUrl;
    const remote = this.databaseUrl.startsWith(SQLitePolicy.RemoteUrlPrefix);
    this.nativeAdapter =
      remote || !isUndefined(process.versions.bun)
        ? new DatabaseReadAdapter({
            url: this.databaseUrl,
            ...(remote ? { fetch: RemoteDatabaseRequests.fetch } : {}),
            ...(isUndefined(environment.values.databaseAuthToken)
              ? {}
              : { authToken: environment.values.databaseAuthToken }),
            timeout: SQLitePolicy.BusyTimeoutMilliseconds,
          })
        : undefined;
    this.client = new PrismaClient({
      adapter: this.nativeAdapter ?? DatabaseAdapters.create(this.databaseUrl),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await SQLiteFiles.prepareDirectory(this.databaseUrl);
      await this.client.$connect();

      if (this.databaseUrl.startsWith(SQLitePolicy.FileUrlPrefix)) {
        await this.client.$queryRawUnsafe(SQLiteStatements.ConfigureBusyTimeout);
        // Local libSQL accepts READONLY syntax without enforcing it; query_only also protects
        // the better-sqlite3 fallback, which begins a deferred transaction.
        await this.client.$queryRawUnsafe(DatabaseReadStatements.EnableReadOnlyConnection);
      }

      this.acceptingReads = true;
    } catch (error) {
      try {
        await this.client.$disconnect();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          DatabaseReadMessages.InitializationCleanupFailed,
          { cause: cleanupError },
        );
      }

      throw error;
    }
  }

  async read<Result>(
    operation: (snapshot: DatabaseReadSnapshot) => Promise<Result>,
    options: DatabaseReadOptions = {},
  ): Promise<Result> {
    if (!this.acceptingReads) {
      throw new Error(DatabaseReadMessages.Unavailable);
    }

    if (!ReadValidation.options(options)) {
      throw new Error(DatabaseReadMessages.InvalidOptions);
    }

    return this.client.$transaction(
      async (transaction) => {
        const queryMany =
          this.nativeAdapter?.queries() ??
          (async (statements) => {
            DatabaseReadStatements.prepare(statements);
            const results: unknown[][] = [];

            for (const statement of statements) {
              results.push(await transaction.$queryRaw<unknown[]>(statement));
            }

            return results;
          });

        return operation({ transaction, queryMany });
      },
      {
        timeout: options.timeout ?? DatabaseReadPolicy.DefaultTimeoutMilliseconds,
        maxWait: DatabaseReadPolicy.AcquisitionTimeoutMilliseconds,
      },
    );
  }

  async onApplicationShutdown(): Promise<void> {
    this.acceptingReads = false;
    await this.client.$disconnect();
  }
}
