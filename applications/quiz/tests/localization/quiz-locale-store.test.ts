import { LocaleStorageFixture } from '../fixtures/locale-storage-fixture';
import { describe, expect, it, vi } from 'vitest';
import { QuizLocalizationPolicy } from '../../source/localization/quiz-localization-policy';

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
    values.set(QuizLocalizationPolicy.StorageKey, 'ru');
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: QuizLocalizationPolicy.StorageKey });
    eventTarget.dispatchEvent(event);

    expect(store.read()).toBe('ru');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
