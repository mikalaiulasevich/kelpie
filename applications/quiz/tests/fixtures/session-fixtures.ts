import { vi } from 'vitest';
import configurationDocument from '../../../../configurations/funnel-v1.json';
import { QuizSessionApi } from '../../source/session/quiz-session-api';

export const SessionFixtures = {
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
