import type { Type } from '@nestjs/common';
import { omit } from 'es-toolkit/object';
import { isNull, isString, isUndefined } from 'es-toolkit/predicate';
import 'reflect-metadata';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { applicationDirectory } from '../../source/application/application-directory.js';
import { ApplicationFactory } from '../../source/application/create-application.js';
import { ConfigurationImportService } from '../../source/configurations/configuration-import.service.js';
import { DatabaseService } from '../../source/database/database.service.js';
import { ApplicationEnvironmentReader } from '../../source/environment/read-application-environment.js';
import { ApplicationMode, EnvironmentFields } from '../../source/environment/environment-policy.js';
import { SQLitePolicy } from '../../source/database/sqlite-policy.js';
import { BackendTestPolicy } from './backend-test-policy.js';
import { BackendFixtureMessages } from './backend-fixture-messages.js';

const Processes = { execute: promisify(execFile) } as const;

export class BackendApplicationFixture {
  private application: Optional<NestFastifyApplication>;

  private temporaryDirectory: Optional<string>;

  private baseUrl: Optional<string>;

  private constructor() {}

  static async create(
    environmentValues: ReadonlyDictionary<string, Optional<string>> = {},
  ): Promise<BackendApplicationFixture> {
    const fixture = new BackendApplicationFixture();
    await fixture.start(environmentValues);

    return fixture;
  }

  static async createFromSnapshot(
    snapshotPath: string,
    environmentValues: ReadonlyDictionary<string, Optional<string>> = {},
  ): Promise<BackendApplicationFixture> {
    const fixture = new BackendApplicationFixture();
    await fixture.start(environmentValues, snapshotPath);

    return fixture;
  }

  getApplication(): NestFastifyApplication {
    if (isUndefined(this.application)) {
      throw new Error(BackendFixtureMessages.Closed);
    }

    return this.application;
  }

  getService<Service>(token: Type<Service>): Service {
    return this.getApplication().get(token);
  }

  getModuleService<Service>(moduleType: Type<unknown>, token: Type<Service>): Service {
    return this.getApplication().select(moduleType).get(token, { strict: true });
  }

  get database(): DatabaseService['client'] {
    return this.getService(DatabaseService).client;
  }

  get configurationImports(): ConfigurationImportService {
    return this.getService(ConfigurationImportService);
  }

  async request(path: string, options?: RequestInit): Promise<Response> {
    if (isUndefined(this.baseUrl)) {
      throw new Error(BackendFixtureMessages.Closed);
    }

    return fetch(`${this.baseUrl}${path}`, options);
  }

  async close(): Promise<void> {
    this.baseUrl = undefined;

    try {
      await this.application?.close();
    } catch (applicationError) {
      try {
        await this.removeDirectory();
      } catch (directoryError) {
        throw new AggregateError(
          [applicationError, directoryError],
          BackendFixtureMessages.CloseCleanupFailed,
          { cause: directoryError },
        );
      }

      throw applicationError;
    } finally {
      this.application = undefined;
    }

    await this.removeDirectory();
  }

  private async removeDirectory(): Promise<void> {
    if (isUndefined(this.temporaryDirectory)) {
      return;
    }

    await rm(this.temporaryDirectory, { recursive: true, force: true });
    this.temporaryDirectory = undefined;
  }

  private async start(
    environmentValues: ReadonlyDictionary<string, Optional<string>>,
    snapshotPath?: string,
  ): Promise<void> {
    this.temporaryDirectory = await mkdtemp(
      resolve(tmpdir(), BackendTestPolicy.TemporaryDirectoryPrefix),
    );
    const databaseUrl = `${SQLitePolicy.FileUrlPrefix}${resolve(this.temporaryDirectory, BackendTestPolicy.DatabaseFilename)}`;

    try {
      if (isUndefined(snapshotPath)) {
        await Processes.execute(
          BackendTestPolicy.PackageManager,
          [...BackendTestPolicy.MigrationArguments],
          {
            cwd: applicationDirectory,
            env: {
              ...omit(process.env, [EnvironmentFields.DatabaseAuthToken]),
              [EnvironmentFields.DatabaseUrl]: databaseUrl,
              [EnvironmentFields.Mode]: ApplicationMode.Test,
            },
            timeout: BackendTestPolicy.TimeoutMilliseconds,
          },
        );
      } else {
        await copyFile(
          snapshotPath,
          resolve(this.temporaryDirectory, BackendTestPolicy.DatabaseFilename),
        );
      }

      this.application = await this.createApplication(databaseUrl, environmentValues);
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

  private async createApplication(
    databaseUrl: string,
    environmentValues: ReadonlyDictionary<string, Optional<string>>,
  ): Promise<NestFastifyApplication> {
    const environment = ApplicationEnvironmentReader.read({
      ...environmentValues,
      [EnvironmentFields.DatabaseUrl]: databaseUrl,
      [EnvironmentFields.Mode]: environmentValues[EnvironmentFields.Mode] ?? ApplicationMode.Test,
    });

    return ApplicationFactory.create(environment);
  }

  private resolveAddress(): string {
    const server: unknown = this.application?.getHttpServer();

    if (!(server instanceof Server)) {
      throw new Error(BackendFixtureMessages.UnsupportedServer);
    }

    const address = server.address();

    if (isNull(address) || isString(address)) {
      throw new Error(BackendFixtureMessages.AddressUnavailable);
    }

    return `http://${BackendTestPolicy.Host}:${address.port}`;
  }
}
