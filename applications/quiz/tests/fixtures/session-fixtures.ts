import type { NumberStep } from '@kelpie/contracts';
import { vi } from 'vitest';
import configurationDocument from '../../../../configurations/funnel-v1.json';
import expansionConfigurationDocument from '../../../../configurations/funnel-v3.json';
import { QuizSessionApi } from '../../source/session/quiz-session-api';
import { QuizObservations } from '../../source/session/quiz-observations';
import type {
  QuizSessionController,
  QuizSessionState,
} from '../../source/session/quiz-session-types';

export const SessionFixtures = {
  controller(state: QuizSessionState | null = null): QuizSessionController {
    return {
      state,
      loading: false,
      busy: false,
      expired: false,
      error: null,
      deliveryError: null,
      start: vi.fn(async () => undefined),
      continueStep: vi.fn(async () => undefined),
      back: vi.fn(async () => undefined),
      recordResultAction: vi.fn(async () => undefined),
      retry: vi.fn(async () => undefined),
    };
  },

  state() {
    return QuizSessionApi.parse({
      sessionIdentifier: '00000000-0000-4000-8000-000000000001',
      revision: 0,
      versionIdentifier: 'version-one',
      funnelIdentifier: configurationDocument.funnelId,
      funnelVersion: 1,
      variant: 'A',
      configuration: configurationDocument,
      currentStepIdentifier: 'intro',
      answers: [],
      progress: { completed: 0, total: 8 },
      result: null,
    });
  },

  numericStep(): NumberStep {
    return {
      id: 'numeric-answer',
      type: 'number',
      content: { title: 'Numeric answer' },
      input: { name: 'numeric-answer', min: 0, max: 1, step: 0.1 },
      validation: { required: true, messages: {} },
    };
  },

  resultState(): QuizSessionState {
    return {
      ...SessionFixtures.state(),
      result: {
        id: 'result-one',
        title: 'Result',
        summary: 'Summary',
        recommendations: ['Recommendation'],
        cta: { label: 'Read more', action: 'expand_recommendation' },
      },
    };
  },

  expandedResultState(): QuizSessionState {
    return QuizSessionApi.parse({
      ...SessionFixtures.resultState(),
      configuration: expansionConfigurationDocument,
      funnelVersion: 3,
    });
  },

  async queuedViews(state: QuizSessionState, count: number): Promise<void> {
    for (let index = 0; index < count; index += 1) {
      await QuizObservations.add(state, 'step_viewed', { step_type: 'info' });
    }
  },

  acknowledgeEvents(state: QuizSessionState) {
    return vi.spyOn(QuizSessionApi, 'request').mockImplementation(async () => ({
      receipts: QuizObservations.read(state)
        .slice(0, 30)
        .map((event) => ({
          event_id: event.event_id,
          status: 'accepted',
        })),
    }));
  },

  storage() {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        values.delete(key);
      }),
    };
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('sessionStorage', storage);

    return storage;
  },
};
