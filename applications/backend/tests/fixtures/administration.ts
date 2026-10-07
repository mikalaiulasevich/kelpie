import { AdministrationService } from '../../source/administration/administration.service.js';
import { BackendApplicationFixture } from './backend-application.js';

export const AdministrationFixture = {
  Credentials: { username: 'reviewer', password: 'a-long-test-password' },
  Headers: {
    origin: 'http://127.0.0.1:5173',
    'x-kelpie-administration': '1',
    'content-type': 'application/json',
  },
  async create(): Promise<BackendApplicationFixture> {
    const application = await BackendApplicationFixture.create();
    try {
      await application
        .getService(AdministrationService)
        .provision(this.Credentials.username, this.Credentials.password);

      return application;
    } catch (error) {
      await application.close();
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
  cookie(response: Response): string {
    return response.headers.get('set-cookie')?.split(';')[0] ?? '';
  },
} as const;
