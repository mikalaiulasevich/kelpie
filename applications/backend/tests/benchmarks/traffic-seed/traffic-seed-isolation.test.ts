import { describe, expect, it, vi } from 'vitest';
import { BackendApplicationFixture } from '../../fixtures/backend-application.js';

describe('isolated traffic backend environment', () => {
  it('starts a local SQLite fixture when the invoking environment has a remote database token', async () => {
    vi.stubEnv('DATABASE_AUTH_TOKEN', 'synthetic-remote-token-must-not-reach-local-adapter');

    try {
      const backend = await BackendApplicationFixture.create();

      try {
        expect(await backend.database.session.count()).toBe(0);
        expect(process.env['DATABASE_AUTH_TOKEN']).toBe(
          'synthetic-remote-token-must-not-reach-local-adapter',
        );
      } finally {
        await backend.close();
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
