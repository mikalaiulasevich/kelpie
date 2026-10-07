import Ajv from 'ajv';
import type { Static } from 'typebox';
import { isNull, isUndefined, isString, isEqual } from 'es-toolkit/predicate';
import {
  FunnelConfigurations,
  StepRules,
  type FunnelResult,
  type SessionAnswers,
  type StepAnswer,
} from '@kelpie/contracts';
import { FunnelEvaluation } from '@kelpie/funnel-runtime';
import {
  QuizSessionSchemas,
  type QuizSessionState,
  type QuizPendingCommand,
} from './quiz-session-types';
import { QuizSessionMessages } from './quiz-session-messages';
import { QuizSessionPolicy } from './quiz-session-policy';

const compiler = new Ajv({ strict: false });

export const QuizSessionValidators = {
  result: compiler.compile<FunnelResult | null>(QuizSessionSchemas.Result),
  pending: compiler.compile<QuizPendingCommand>(QuizSessionSchemas.Pending),
  state: compiler.compile<Static<typeof QuizSessionSchemas.State>>(QuizSessionSchemas.State),
  envelope: compiler.compile<Static<typeof QuizSessionSchemas.Envelope>>(
    QuizSessionSchemas.Envelope,
  ),
  events: compiler.compile<Static<typeof QuizSessionSchemas.Events>>(QuizSessionSchemas.Events),
  receipts: compiler.compile<Static<typeof QuizSessionSchemas.Receipts>>(
    QuizSessionSchemas.Receipts,
  ),
  answer: compiler.compile<StepAnswer | null>(QuizSessionSchemas.Answer),
};

export class QuizRequestError extends Error {
  constructor(readonly status: number) {
    super(status === 409 ? QuizSessionMessages.Conflict : QuizSessionMessages.Rejected);
  }
}

export const QuizSessionApi = {
  async request(path: string, body?: unknown): Promise<unknown> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request('kelpie.quiz.session', () => QuizSessionApi.send(path, body));
    }

    return QuizSessionApi.send(path, body);
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

  evaluate(state: QuizSessionState) {
    const answers: Record<string, StepAnswer> = {};

    for (const answer of state.answers) {
      const step = state.configuration.steps[answer.stepIdentifier];

      if (
        !isNull(answer.confirmationRevision) &&
        !isNull(answer.value) &&
        step &&
        StepRules.isInteractive(step)
      ) {
        Object.defineProperty(answers, step.input.name, { value: answer.value, enumerable: true });
      }
    }

    return FunnelEvaluation.evaluate(
      state.configuration,
      state.variant,
      answers satisfies SessionAnswers,
    );
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

  async current() {
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

export const QuizDrafts = {
  key(state: QuizSessionState, stepIdentifier: string): string {
    return `${QuizSessionPolicy.StoragePrefix}draft.${state.sessionIdentifier}.${state.versionIdentifier}.${stepIdentifier}`;
  },

  read(state: QuizSessionState, stepIdentifier: string): StepAnswer | null | undefined {
    const raw = localStorage.getItem(QuizDrafts.key(state, stepIdentifier));

    if (isNull(raw)) {
      return undefined;
    }

    const value: unknown = JSON.parse(raw);

    return QuizSessionValidators.answer(value) ? value : undefined;
  },

  write(state: QuizSessionState, stepIdentifier: string, value: StepAnswer | null): void {
    localStorage.setItem(QuizDrafts.key(state, stepIdentifier), JSON.stringify(value));
  },

  remove(state: QuizSessionState, stepIdentifier: string): void {
    localStorage.removeItem(QuizDrafts.key(state, stepIdentifier));
  },
};

export const QuizPendingStorage = {
  restore(state: QuizSessionState | null): QuizPendingCommand | null {
    const stored = QuizPendingStorage.read();
    const isCreation =
      stored?.path === QuizSessionPolicy.Create ||
      stored?.path.startsWith(`${QuizSessionPolicy.Create}?`);
    const matches = state
      ? stored?.sessionIdentifier === state.sessionIdentifier &&
        stored.body.expectedSessionRevision === state.revision &&
        stored.body.stepIdentifier === state.currentStepIdentifier
      : isCreation;

    if (!matches) {
      QuizPendingStorage.write(null);

      return null;
    }

    return stored;
  },

  confirmDraft(state: QuizSessionState, command: QuizPendingCommand): void {
    const stepIdentifier = command.body.stepIdentifier;

    if (
      command.path.endsWith('/answers') &&
      isString(stepIdentifier) &&
      command.sessionIdentifier === state.sessionIdentifier &&
      isEqual(QuizDrafts.read(state, stepIdentifier), command.body.answer)
    ) {
      QuizDrafts.remove(state, stepIdentifier);
    }
  },

  read(): QuizPendingCommand | null {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(`${QuizSessionPolicy.StoragePrefix}pending`) ?? 'null',
    );

    return QuizSessionValidators.pending(value) ? value : null;
  },

  write(command: QuizPendingCommand | null): void {
    sessionStorage.setItem(`${QuizSessionPolicy.StoragePrefix}pending`, JSON.stringify(command));
  },
};
