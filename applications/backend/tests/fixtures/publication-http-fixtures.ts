import type { BackendApplicationFixture } from './backend-application.js';
import { AdministrationFixture } from './administration.js';

export const PublicationHttpFixtures = {
  post(
    backend: BackendApplicationFixture,
    route: string,
    cookie: string,
    document: unknown,
  ): Promise<Response> {
    return backend.request(`/api/administration/${route}`, {
      method: 'POST',
      headers: { ...AdministrationFixture.Headers, cookie },
      body: JSON.stringify(document),
    });
  },
} as const;
