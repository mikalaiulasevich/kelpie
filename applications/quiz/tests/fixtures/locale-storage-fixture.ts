import { vi } from 'vitest';

export const LocaleStorageFixture = {
  async create() {
    vi.resetModules();
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };
    vi.stubGlobal('localStorage', storage);
    const eventTarget = new EventTarget();
    vi.stubGlobal('window', eventTarget);
    const { QuizLocaleStore } = await import('../../source/localization/quiz-locale-store');

    return { store: QuizLocaleStore, storage, values, eventTarget };
  },
};
