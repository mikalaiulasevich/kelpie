import { isNull } from 'es-toolkit';
import { QuizLocalization } from './quiz-localization';
import { QuizLocalizationPolicy } from './quiz-localization-policy';
import type { QuizLocale } from './quiz-localization-types';

let selectedLocale: Optional<QuizLocale>;
const listeners = new Set<() => void>();

export const QuizLocaleStore = {
  read(): QuizLocale {
    if (selectedLocale) {
      return selectedLocale;
    }

    try {
      return QuizLocalization.resolve(localStorage.getItem(QuizLocalizationPolicy.StorageKey));
    } catch {
      return QuizLocalizationPolicy.DefaultLocale;
    }
  },

  write(locale: QuizLocale): boolean {
    selectedLocale = locale;
    let saved = true;

    try {
      localStorage.setItem(QuizLocalizationPolicy.StorageKey, locale);
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
      if (event.key === QuizLocalizationPolicy.StorageKey || isNull(event.key)) {
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
    return QuizLocalizationPolicy.DefaultLocale;
  },
};
