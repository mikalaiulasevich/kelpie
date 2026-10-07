import { vi } from 'vitest';
import { isPlainObject } from 'es-toolkit/predicate';
import { BackendFixtureMessages } from './backend-fixture-messages.js';
import { AdministrationService } from '../../source/administration/administration.service.js';
import { BackendApplicationFixture } from './backend-application.js';

export const AdministrationFixture = {
  Credentials: { username: 'reviewer', password: 'a-long-test-password' },
  Headers: {
    origin: 'http://127.0.0.1:5173',
    'x-kelpie-administration': '1',
    'content-type': 'application/json',
  },

  inheritedCredentials(): unknown {
    return Object.create(AdministrationFixture.Credentials);
  },

  async create(): Promise<BackendApplicationFixture> {
    const application = await BackendApplicationFixture.create();

    try {
      await application
        .getService(AdministrationService)
        .provision(this.Credentials.username, this.Credentials.password);

      return application;
    } catch (error) {
      try {
        await application.close();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], BackendFixtureMessages.SetupCleanupFailed, {
          cause: cleanupError,
        });
      }

      throw error;
    }
  },

  signIn(application: BackendApplicationFixture, password?: string): Promise<Response> {
    return application.request('/api/administration/sign-in', {
      method: 'POST',
      headers: this.Headers,
      body: JSON.stringify({
        ...this.Credentials,
        password: password ?? this.Credentials.password,
      }),
    });
  },

  mutateCredentialsDuringSignIn(application: BackendApplicationFixture) {
    const service = application.getService(AdministrationService);
    const signIn = service.signIn.bind(service);

    return vi.spyOn(service, 'signIn').mockImplementation((request, reply, body) => {
      const result = signIn(request, reply, body);

      if (isPlainObject(body)) {
        Object.assign(body, {
          username: 'changed-after-validation',
          password: 'changed-after-validation',
        });
      }

      return result;
    });
  },

  async sessionStatus(application: BackendApplicationFixture, cookie: string): Promise<number> {
    const response = await application.request('/api/administration/session', {
      headers: { cookie },
    });

    return response.status;
  },

  cookie(response: Response): string {
    return response.headers.get('set-cookie')?.split(';')[0] ?? '';
  },
} as const;
