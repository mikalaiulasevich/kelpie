import 'reflect-metadata';
import { BackendTestPolicy } from './backend-test-policy.js';
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

const Processes = { execute: promisify(execFile) } as const;

export class BackendApplicationFixture {
  private application: Optional<NestExpressApplication>;
  private temporaryDirectory: Optional<string>;
  private baseUrl = '';

  private constructor() {}

  static async create(): Promise<BackendApplicationFixture> {
    const fixture = new BackendApplicationFixture();
    await fixture.start();

    return fixture;
  }

  get database(): DatabaseService['client'] {
    if (!this.application) {
      throw new Error('Start the backend fixture before accessing its database.');
    }

    return this.application.get(DatabaseService).client;
  }

  private async start(): Promise<void> {
    this.temporaryDirectory = await mkdtemp(
      resolve(tmpdir(), BackendTestPolicy.temporaryDirectoryPrefix),
    );
    const databaseUrl = `file:${resolve(this.temporaryDirectory, BackendTestPolicy.databaseFilename)}`;

    try {
      await Processes.execute('npm', ['run', 'database:migrate'], {
        cwd: applicationDirectory,
        env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
        timeout: BackendTestPolicy.timeoutMilliseconds,
      });
      this.application = await this.createApplication(databaseUrl);
      await this.application.listen(0, '127.0.0.1');
      this.baseUrl = this.resolveAddress();
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async request(path: string, options?: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, options);
  }

  async close(): Promise<void> {
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

  private async createApplication(databaseUrl: string): Promise<NestExpressApplication> {
    const environment = ApplicationEnvironmentReader.read({
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'test',
    });

    return ApplicationFactory.create(environment);
  }

  private resolveAddress(): string {
    const server: unknown = this.application?.getHttpServer();

    if (!(server instanceof Server)) {
      throw new Error('Test HTTP server adapter is unsupported.');
    }

    const address = server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Test server has no network address.');
    }

    return `http://127.0.0.1:${address.port}`;
  }
}
