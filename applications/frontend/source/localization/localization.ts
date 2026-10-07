import { LocalizationPolicy } from './localization-policy';
import { LocalizationTranslation } from './localization-translation';
import {
  InterfaceLocale,
  type LocalizationSnapshot,
  type TranslationParameters,
} from './localization-types';

const listeners = new Set<() => void>();
let current: LocalizationSnapshot = {
  locale: LocalizationPolicy.DefaultLocale,
  storageFailed: false,
};

const LocalizationState = {
  update(locale: InterfaceLocale, storageFailed: boolean): void {
    if (current.locale !== locale || current.storageFailed !== storageFailed) {
      current = { locale, storageFailed };
    }

    document.documentElement.lang = locale;
  },
} as const;

export const Localization = {
  get locale(): InterfaceLocale {
    return current.locale;
  },

  get formattingLocale(): string {
    return LocalizationPolicy.FormattingLocales[current.locale];
  },

  initialize(): void {
    try {
      const stored = localStorage.getItem(LocalizationPolicy.StorageKey);
      LocalizationState.update(
        stored === InterfaceLocale.Russian
          ? InterfaceLocale.Russian
          : LocalizationPolicy.DefaultLocale,
        false,
      );
    } catch {
      LocalizationState.update(current.locale, true);
    }
  },

  setLocale(locale: InterfaceLocale): void {
    try {
      localStorage.setItem(LocalizationPolicy.StorageKey, locale);
      LocalizationState.update(locale, false);
    } catch {
      LocalizationState.update(locale, true);
    }

    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },

  snapshot(): LocalizationSnapshot {
    return current;
  },

  translate(message: string, parameters: TranslationParameters = {}): string {
    return LocalizationTranslation.interpolate(
      LocalizationTranslation.resolve(current.locale, message),
      parameters,
    );
  },
};
