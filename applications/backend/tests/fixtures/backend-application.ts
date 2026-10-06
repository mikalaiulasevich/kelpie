import 'reflect-metadata';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { applicationDirectory } from '../../source/application/application-directory.js';
import { ApplicationFactory } from '../../source/application/create-application.js';
import { DatabaseService } from '../../source/database/database.service.js';
import { ApplicationEnvironmentReader } from '../../source/environment/read-application-environment.js';
import { ApplicationMode, EnvironmentFields } from '../../source/environment/environment-policy.js';
import { SQLitePolicy } from '../../source/database/sqlite-policy.js';
import { BackendTestPolicy } from './backend-test-policy.js';
import { BackendFixtureMessages } from './backend-fixture-messages.js';

const Processes = { execute: promisify(execFile) } as const;

export class BackendApplicationFixture {
  private application: Optional<NestExpressApplication>;
  private temporaryDirectory: Optional<string>;
  private baseUrl: Optional<string>;

  private constructor() {}

  static async create(): Promise<BackendApplicationFixture> {
    const fixture = new BackendApplicationFixture();
    await fixture.start();

    return fixture;
  }

  get database(): DatabaseService['client'] {
    if (!this.application) {
      throw new Error(BackendFixtureMessages.Closed);
    }

    return this.application.get(DatabaseService).client;
  }

  async request(path: string, options?: RequestInit): Promise<Response> {
    if (this.baseUrl === undefined) {
      throw new Error(BackendFixtureMessages.Closed);
    }

    return fetch(`${this.baseUrl}${path}`, options);
  }

  async close(): Promise<void> {
    this.baseUrl = undefined;

    try {
      await this.application?.close();
    } finally {
      this.application = undefined;

      if (this.temporaryDirectory) {
        await rm(this.temporaryDirectory, { recursive: true, force: true });
        this.temporaryDirectory = undefined;
      }
    }
  }

  private async start(): Promise<void> {
    this.temporaryDirectory = await mkdtemp(
      resolve(tmpdir(), BackendTestPolicy.TemporaryDirectoryPrefix),
    );
    const databaseUrl = `${SQLitePolicy.FileUrlPrefix}${resolve(this.temporaryDirectory, BackendTestPolicy.DatabaseFilename)}`;

    try {
      await Processes.execute(
        BackendTestPolicy.PackageManager,
        [...BackendTestPolicy.MigrationArguments],
        {
          cwd: applicationDirectory,
          env: {
            ...process.env,
            [EnvironmentFields.DatabaseUrl]: databaseUrl,
            [EnvironmentFields.Mode]: ApplicationMode.Test,
          },
          timeout: BackendTestPolicy.TimeoutMilliseconds,
        },
      );
      this.application = await this.createApplication(databaseUrl);
      await this.application.listen(BackendTestPolicy.EphemeralPort, BackendTestPolicy.Host);
      this.baseUrl = this.resolveAddress();
    } catch (setupError) {
      try {
        await this.close();
      } catch (cleanupError) {
        throw new AggregateError(
          [setupError, cleanupError],
          BackendFixtureMessages.SetupCleanupFailed,
          { cause: cleanupError },
        );
      }

      throw setupError;
    }
  }

  private async createApplication(databaseUrl: string): Promise<NestExpressApplication> {
    const environment = ApplicationEnvironmentReader.read({
      [EnvironmentFields.DatabaseUrl]: databaseUrl,
      [EnvironmentFields.Mode]: ApplicationMode.Test,
    });

    return ApplicationFactory.create(environment);
  }

  private resolveAddress(): string {
    const server: unknown = this.application?.getHttpServer();

    if (!(server instanceof Server)) {
      throw new Error(BackendFixtureMessages.UnsupportedServer);
    }

    const address = server.address();

    if (address === null || typeof address === 'string') {
      throw new Error(BackendFixtureMessages.AddressUnavailable);
    }

    return `http://${BackendTestPolicy.Host}:${address.port}`;
  }
}
