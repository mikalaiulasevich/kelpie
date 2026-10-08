import { DatabaseReadAdapter } from '../../source/database/database-read-adapter.js';
import { DatabaseReadService } from '../../source/database/database-read.service.js';
import { ApplicationEnvironmentService } from '../../source/environment/application-environment.js';
import type { BackendApplicationFixture } from './backend-application.js';

export const DatabaseReadFixture = {
  native() {
    const adapter = new DatabaseReadAdapter({ url: ':memory:' });
    const client = adapter.createClient({ url: ':memory:' });

    return { adapter, client };
  },

  service(backend: BackendApplicationFixture): DatabaseReadService {
    return new DatabaseReadService(backend.getService(ApplicationEnvironmentService));
  },
} as const;
