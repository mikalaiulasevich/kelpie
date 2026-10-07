import { QuizSessionApi, QuizSessionValidators } from './quiz-session-api';
import { QuizSessionMessages } from './quiz-session-messages';
import { QuizSessionPolicy } from './quiz-session-policy';
import type { QuizObservation, QuizObservationInput, QuizSessionState } from './quiz-session-types';

export const QuizObservations = {
  key(state: QuizSessionState): string {
    return `${QuizSessionPolicy.StoragePrefix}events.${state.sessionIdentifier}.${state.versionIdentifier}`;
  },

  read(state: QuizSessionState): QuizObservation[] {
    const value: unknown = JSON.parse(localStorage.getItem(QuizObservations.key(state)) ?? '[]');

    if (!QuizSessionValidators.events(value)) {
      throw new Error(QuizSessionMessages.Delivery);
    }

    return value;
  },

  async add(
    state: QuizSessionState,
    name: string,
    properties: Record<string, TextOrNumber>,
  ): Promise<void> {
    await QuizObservations.enqueue(state, [{ name, properties }]);
  },

  async enqueue(
    state: QuizSessionState,
    observations: readonly QuizObservationInput[],
  ): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      await navigator.locks.request(QuizObservations.key(state), async () =>
        QuizObservations.append(state, observations),
      );

      return;
    }

    QuizObservations.append(state, observations);
  },

  append(state: QuizSessionState, observations: readonly QuizObservationInput[]): void {
    const allowed = observations.filter((observation) =>
      state.configuration.events.allowed.some((event) => event.name === observation.name),
    );

    if (allowed.length === 0) {
      return;
    }

    const events = QuizObservations.read(state);
    const additions: QuizObservation[] = allowed.map((observation) => ({
      event_id: crypto.randomUUID(),
      session_id: state.sessionIdentifier,
      name: observation.name,
      client_timestamp: new Date().toISOString(),
      step_id: state.currentStepIdentifier,
      observationRevision: state.revision,
      properties: observation.properties,
    }));
    const serialized = JSON.stringify([...events, ...additions]);

    if (
      events.length + additions.length > QuizSessionPolicy.QueueLimit ||
      serialized.length > QuizSessionPolicy.QueueBytes
    ) {
      throw new Error(QuizSessionMessages.Delivery);
    }

    localStorage.setItem(QuizObservations.key(state), serialized);
  },

  async view(state: QuizSessionState): Promise<void> {
    const evaluation = QuizSessionApi.evaluate(state);
    const index = evaluation.route.steps.findIndex(
      (step) => step.id === state.currentStepIdentifier,
    );
    const step = evaluation.route.steps[index];

    if (!step) {
      return;
    }

    const observations: QuizObservationInput[] = [
      {
        name: 'step_viewed',
        properties: {
          step_type: step.type,
          visible_step_index: index,
          visible_step_count: evaluation.route.steps.length,
        },
      },
    ];

    if (state.result) {
      observations.push({ name: 'result_viewed', properties: { result_id: state.result.id } });
    }

    await QuizObservations.enqueue(state, observations);
  },

  async flush(state: QuizSessionState): Promise<void> {
    const events = QuizObservations.read(state).slice(0, QuizSessionPolicy.BatchLimit);

    if (events.length === 0) {
      QuizObservations.checkRejected(state);

      return;
    }

    const response = await QuizSessionApi.request(QuizSessionPolicy.Events, { events });

    if (!QuizSessionValidators.receipts(response)) {
      throw new Error(QuizSessionMessages.Delivery);
    }

    const identifiers = new Set(response.receipts.map((receipt) => receipt.event_id));

    if (typeof navigator !== 'undefined' && navigator.locks) {
      await navigator.locks.request(QuizObservations.key(state), async () =>
        QuizObservations.remove(state, identifiers),
      );
    } else {
      QuizObservations.remove(state, identifiers);
    }

    if (response.receipts.some((receipt) => receipt.status === 'rejected')) {
      localStorage.setItem(`${QuizObservations.key(state)}.rejected`, 'true');
    }

    QuizObservations.checkRejected(state);
  },

  checkRejected(state: QuizSessionState): void {
    if (localStorage.getItem(`${QuizObservations.key(state)}.rejected`) === 'true') {
      throw new Error(QuizSessionMessages.EventRejected);
    }
  },

  remove(state: QuizSessionState, identifiers: ReadonlySet<string | undefined>): void {
    const remaining = QuizObservations.read(state).filter(
      (event) => !identifiers.has(event.event_id),
    );
    localStorage.setItem(QuizObservations.key(state), JSON.stringify(remaining));
  },
};
