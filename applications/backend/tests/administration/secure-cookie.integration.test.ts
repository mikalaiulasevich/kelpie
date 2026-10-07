import { expect, it } from 'vitest';
import { AdministrationService } from '../../source/administration/administration.service.js';
import { AdministrationFixture } from '../fixtures/administration.js';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';

it('sets Secure cookies for an explicitly configured production origin', async () => {
  const application = await BackendApplicationFixture.create({
    NODE_ENV: 'production',
    ADMINISTRATION_ORIGIN: 'https://kelpie.example',
  });

  try {
    await application
      .getService(AdministrationService)
      .provision(
        AdministrationFixture.Credentials.username,
        AdministrationFixture.Credentials.password,
      );
    const response = await application.request('/api/administration/sign-in', {
      method: 'POST',
      headers: { ...AdministrationFixture.Headers, origin: 'https://kelpie.example' },
      body: JSON.stringify(AdministrationFixture.Credentials),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('; Secure');
    expect(response.headers.get('set-cookie')).toContain('; HttpOnly');
    expect(response.headers.get('cache-control')).toBe('no-store');
  } finally {
    await application.close();
  }
});
