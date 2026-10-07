import {
  DiagnosticEvents,
  ErrorClassification,
} from '../../source/diagnostics/diagnostic-policy.js';

export const DiagnosticRecordsFixture = {
  sensitive() {
    const secret = 'private-log-secret';

    return {
      event: DiagnosticEvents.ApplicationStarted,
      password: secret,
      accessToken: secret,
      headers: { authorization: secret, cookie: secret },
      body: { answer: secret },
      request: { url: secret },
      error: {
        classification: ErrorClassification.Error,
        safeMessage: undefined,
        code: undefined,
        fingerprint: 'reporting-site',
        frames: [],
        message: secret,
        stack: secret,
        cause: secret,
      },
      details: { password: secret, token: secret, safe: 'retained' },
    };
  },
} as const;
