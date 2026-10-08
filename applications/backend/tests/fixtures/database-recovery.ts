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
    resources.splice(resources.indexOf(backend), 1);
  },

  path(backend: BackendApplicationFixture) {
    return backend
      .getService(ApplicationEnvironmentService)
      .values.databaseUrl.slice('file:'.length);
  },
} as const;

export const RecoveryCleanup = {
  async run() {
    for (const backend of resources.splice(0)) {
      await backend.close();
    }

    for (const directory of directories.splice(0)) {
      await rm(directory, { recursive: true, force: true });
    }
  },
} as const;
