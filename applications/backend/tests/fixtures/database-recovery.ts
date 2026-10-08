import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { ApplicationEnvironmentService } from '../../source/environment/application-environment.js';
import { BackendApplicationFixture } from './backend-application.js';

const resources: BackendApplicationFixture[] = [];
const directories: string[] = [];

export const RecoveryFixture = {
  async directory() {
    const directory = await mkdtemp(resolve(tmpdir(), 'kelpie-backup-test-'));
    directories.push(directory);

    return directory;
  },

  async backend(snapshot?: string) {
    const backend = snapshot
      ? await BackendApplicationFixture.createFromSnapshot(snapshot)
      : await BackendApplicationFixture.create();
    resources.push(backend);

    return backend;
  },

  forget(backend: BackendApplicationFixture) {
    const index = resources.indexOf(backend);

    if (index >= 0) {
      resources.splice(index, 1);
    }
  },

  path(backend: BackendApplicationFixture) {
    return backend
      .getService(ApplicationEnvironmentService)
      .values.databaseUrl.slice('file:'.length);
  },
} as const;

export const RecoveryCleanup = {
  async run() {
    const backends = await Promise.allSettled(
      resources.splice(0).map((backend) => backend.close()),
    );
    const folders = await Promise.allSettled(
      directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
    );
    const failures = [...backends, ...folders]
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason);

    if (failures.length > 0) {
      throw new AggregateError(failures, 'Recovery fixture cleanup failed.');
    }
  },
} as const;
