import { describe, expect, it } from 'vitest';
import { ProxyCases } from '../cases/application/proxy-cases.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';

describe('Explicit loopback proxy boundary', () => {
  it.each(ProxyCases)('$name', async ({ enabled, expectedStatus }) => {
    const backend = await BackendApplicationFixture.create({ TRUST_PROXY_LOOPBACK: enabled });

    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await backend.request('/api/administration/sign-in', {
          method: 'POST',
          headers: { ...AdministrationFixture.Headers, 'x-forwarded-for': '198.51.100.1' },
          body: '{}',
        });

        expect(response.status).toBe(401);
      }

      const response = await backend.request('/api/administration/sign-in', {
        method: 'POST',
        headers: { ...AdministrationFixture.Headers, 'x-forwarded-for': '198.51.100.2' },
        body: '{}',
      });

      expect(response.status).toBe(expectedStatus);
    } finally {
      await backend.close();
    }
  });
});
