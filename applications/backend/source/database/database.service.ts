import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { applicationDirectory } from '../application-directory.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ApplicationEnvironmentService } from '../environment/application-environment.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;
  private readonly databaseUrl: string;
  private expectedMigrations: string[] = [];

  constructor(@Inject(ApplicationEnvironmentService) environment: ApplicationEnvironmentService) {
    this.databaseUrl = environment.values.databaseUrl;
    const adapter = new PrismaBetterSqlite3({ url: this.databaseUrl });
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await mkdir(dirname(this.databaseUrl.slice(5)), { recursive: true });
    const migrationDirectories = await readdir(resolve(applicationDirectory, 'prisma/migrations'), {
      withFileTypes: true,
    });
    this.expectedMigrations = migrationDirectories
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    if (this.expectedMigrations.length === 0)
      throw new Error('Application migration history is unavailable.');
    await this.client.$connect();
    await this.client.$queryRawUnsafe('PRAGMA journal_mode = WAL');
    await this.client.$queryRawUnsafe('PRAGMA busy_timeout = 5000');
    await this.client.$queryRawUnsafe('PRAGMA foreign_keys = ON');
    const settings =
      await this.client.$queryRawUnsafe<Array<{ foreign_keys: bigint }>>('PRAGMA foreign_keys');
    if (Number(settings[0]?.foreign_keys) !== 1)
      throw new Error('SQLite foreign key enforcement is unavailable.');
  }

  async checkReadiness(): Promise<boolean> {
    await this.client.$queryRaw`SELECT 1`;
    const migrations = await this.client.$queryRawUnsafe<
      Array<{
        migration_name: string;
        successful: bigint;
        unresolved: bigint;
      }>
    >(
      'SELECT "migration_name", SUM(CASE WHEN "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL THEN 1 ELSE 0 END) AS "successful", SUM(CASE WHEN "finished_at" IS NULL AND "rolled_back_at" IS NULL THEN 1 ELSE 0 END) AS "unresolved" FROM "_prisma_migrations" GROUP BY "migration_name"',
    );
    if (migrations.some((migration) => Number(migration.unresolved) > 0)) return false;
    const successfulMigrations = new Set(
      migrations
        .filter((migration) => Number(migration.successful) > 0)
        .map((migration) => migration.migration_name),
    );
    return this.expectedMigrations.every((migration) => successfulMigrations.has(migration));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
