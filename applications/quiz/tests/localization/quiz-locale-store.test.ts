import { describe, expect, it, vi } from 'vitest';
import { QuizLocalization } from '../../source/localization/quiz-localization';

const LocaleStorageFixture = {
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

describe('Quiz language preference storage', () => {
  it('restores the selected language after module reload and notifies subscribers', async () => {
    const { store, storage } = await LocaleStorageFixture.create();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    expect(store.write('ru')).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith('kelpie.quiz.locale', 'ru');
    expect(listener).toHaveBeenCalledOnce();
    expect(store.read()).toBe('ru');
    unsubscribe();
    store.write('en');
    expect(listener).toHaveBeenCalledOnce();
    storage.getItem.mockReturnValue('ru');
    vi.resetModules();
    const reloaded = await import('../../source/localization/quiz-locale-store');

    expect(reloaded.QuizLocaleStore.read()).toBe('ru');
    expect(reloaded.QuizLocaleStore.serverSnapshot()).toBe('en');
  });

  it('keeps the language usable and reports failed persistence when storage is blocked', async () => {
    const { store, storage } = await LocaleStorageFixture.create();
    storage.setItem.mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });

    expect(store.write('ru')).toBe(false);
    expect(store.read()).toBe('ru');
  });

  it('synchronizes language changes from another tab without touching session data', async () => {
    const { store, values, eventTarget } = await LocaleStorageFixture.create();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.write('en');
    values.set(QuizLocalization.StorageKey, 'ru');
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: QuizLocalization.StorageKey });
    eventTarget.dispatchEvent(event);

    expect(store.read()).toBe('ru');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
