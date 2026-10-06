import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ApplicationEnvironmentService } from '../environment/application-environment.js';
import { DatabaseMessages } from './database-messages.js';
import { MigrationHistory, type MigrationSummary } from './migration-history.js';
import { SQLiteFiles } from './sqlite-files.js';
import { SQLitePolicy } from './sqlite-policy.js';

interface SQLiteForeignKeySetting {
  readonly foreign_keys: bigint;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;
  private readonly databaseUrl: string;
  private expectedMigrations: ReadonlyList<string> = [];

  constructor(@Inject(ApplicationEnvironmentService) environment: ApplicationEnvironmentService) {
    this.databaseUrl = environment.values.databaseUrl;

    const adapter = new PrismaBetterSqlite3({ url: this.databaseUrl });
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await SQLiteFiles.prepareDirectory(this.databaseUrl);
    this.expectedMigrations = await MigrationHistory.expected();
    await this.client.$connect();
    await this.configureConnection();
  }

  async checkReadiness(): Promise<boolean> {
    const migrations = await this.client.$queryRawUnsafe<MigrationSummary[]>(
      MigrationHistory.summaryQuery,
    );

    return MigrationHistory.isComplete(this.expectedMigrations, migrations);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  private async configureConnection(): Promise<void> {
    await this.client.$queryRawUnsafe('PRAGMA journal_mode = WAL');
    await this.client.$queryRawUnsafe(
      `PRAGMA busy_timeout = ${SQLitePolicy.BusyTimeoutMilliseconds}`,
    );
    await this.client.$queryRawUnsafe('PRAGMA foreign_keys = ON');
    const settings =
      await this.client.$queryRawUnsafe<SQLiteForeignKeySetting[]>('PRAGMA foreign_keys');

    if (settings[0]?.foreign_keys !== 1n) {
      throw new Error(DatabaseMessages.ForeignKeysUnavailable);
    }
  }
}
