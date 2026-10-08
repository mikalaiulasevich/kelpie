import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { DatabaseAdapters } from './database-adapters.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ApplicationEnvironmentService } from '../environment/application-environment.js';
import { DatabaseMessages } from './database-messages.js';
import { MigrationHistory } from './migration-history.js';
import type { MigrationSummary, SQLiteForeignKeySetting } from './database-types.js';
import { SQLiteFiles } from './sqlite-files.js';
import { SQLiteStatements } from './sqlite-statements.js';
import { SQLitePolicy } from './sqlite-policy.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  readonly client: PrismaClient;

  private readonly databaseUrl: string;

  private expectedMigrations: ReadonlyList<string> = [];

  constructor(@Inject(ApplicationEnvironmentService) environment: ApplicationEnvironmentService) {
    this.databaseUrl = environment.values.databaseUrl;

    const adapter = DatabaseAdapters.create(this.databaseUrl, environment.values.databaseAuthToken);
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
      SQLiteStatements.MigrationSummary,
    );

    return MigrationHistory.isComplete(this.expectedMigrations, migrations);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.$disconnect();
  }

  private async configureConnection(): Promise<void> {
    if (this.databaseUrl.startsWith(SQLitePolicy.FileUrlPrefix)) {
      await this.client.$queryRawUnsafe(SQLiteStatements.EnableWriteAheadLogging);
      await this.client.$queryRawUnsafe(SQLiteStatements.ConfigureBusyTimeout);
    }

    await this.client.$queryRawUnsafe(SQLiteStatements.EnableForeignKeys);
    const settings = await this.client.$queryRawUnsafe<SQLiteForeignKeySetting[]>(
      SQLiteStatements.ReadForeignKeys,
    );

    if (Number(settings[0]?.foreign_keys) !== SQLitePolicy.EnabledSetting) {
      throw new Error(DatabaseMessages.ForeignKeysUnavailable);
    }
  }
}
