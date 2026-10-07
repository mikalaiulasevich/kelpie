import { QuizBrowserLocks } from './quiz-browser-locks';
import { isNull, isUndefined } from 'es-toolkit/predicate';
import { FunnelConfigurations } from '@kelpie/contracts';
import {
  QuizSessionValidators,
  type QuizSessionState,
  type QuizPendingCommand,
  type QuizSessionEnvelope,
} from './quiz-session-types';
import { QuizSessionMessages } from './quiz-session-messages';
import { QuizSessionPolicy } from './quiz-session-policy';
import { QuizRequestError } from './quiz-session-failures';

export const QuizSessionApi = {
  async request(path: string, body?: unknown): Promise<unknown> {
    return QuizBrowserLocks.run(QuizSessionPolicy.SessionLockName, () =>
      QuizSessionApi.send(path, body),
    );
  },

  async send(path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(path, {
      method: isUndefined(body) ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Kelpie-Session': '1' },
      ...(isUndefined(body) ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(QuizSessionPolicy.TimeoutMilliseconds),
    });

    if (!response.ok) {
      throw new QuizRequestError(response.status);
    }

    return response.json();
  },

  parse(value: unknown): QuizSessionState {
    if (!QuizSessionValidators.state(value)) {
      throw new Error(QuizSessionMessages.Invalid);
    }

    const configuration = FunnelConfigurations.validate(value.configuration);

    if (!configuration.valid) {
      throw new Error(QuizSessionMessages.Invalid);
    }

    if (!QuizSessionValidators.result(value.result)) {
      throw new Error(QuizSessionMessages.Invalid);
    }

    return { ...value, configuration: configuration.configuration, result: value.result };
  },

  async current(): Promise<QuizSessionEnvelope> {
    const value = await QuizSessionApi.request(QuizSessionPolicy.Current);

    if (!QuizSessionValidators.envelope(value)) {
      throw new Error(QuizSessionMessages.Invalid);
    }

    return {
      state: isNull(value.state) ? null : QuizSessionApi.parse(value.state),
      expired: value.expired,
    };
  },

  async command(command: QuizPendingCommand): Promise<QuizSessionState> {
    return QuizSessionApi.parse(await QuizSessionApi.request(command.path, command.body));
  },
};
