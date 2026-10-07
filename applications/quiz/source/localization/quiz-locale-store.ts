import { isNull } from 'es-toolkit';
import { QuizLocalization, type QuizLocale } from './quiz-localization';

let selectedLocale: QuizLocale | undefined;
const listeners = new Set<() => void>();

export const QuizLocaleStore = {
  read(): QuizLocale {
    if (selectedLocale) {
      return selectedLocale;
    }

    try {
      return QuizLocalization.resolve(localStorage.getItem(QuizLocalization.StorageKey));
    } catch {
      return 'en';
    }
  },

  write(locale: QuizLocale): boolean {
    selectedLocale = locale;
    let saved = true;

    try {
      localStorage.setItem(QuizLocalization.StorageKey, locale);
    } catch {
      saved = false;
    }

    for (const listener of listeners) {
      listener();
    }

    return saved;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    const synchronize = (event: StorageEvent) => {
      if (event.key === QuizLocalization.StorageKey || isNull(event.key)) {
        selectedLocale = undefined;
        listener();
      }
    };

    window.addEventListener('storage', synchronize);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', synchronize);
    };
  },

  serverSnapshot(): QuizLocale {
    return 'en';
  },
};
