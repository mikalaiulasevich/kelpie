import { ConfigurationTranslations } from './configuration-translations';
import { InterfaceTranslations } from './interface-translations';

export type InterfaceLocale = 'en' | 'ru';

const listeners = new Set<() => void>();
const storageKey = 'kelpie.administration.language';
let selectedLocale: InterfaceLocale = 'en';
let storageFailed = false;

export const Localization = {
  get locale(): InterfaceLocale {
    return selectedLocale;
  },

  get formattingLocale(): string {
    return selectedLocale === 'ru' ? 'ru-RU' : 'en-US';
  },

  get storageFailed(): boolean {
    return storageFailed;
  },

  initialize(): void {
    try {
      selectedLocale = localStorage.getItem(storageKey) === 'ru' ? 'ru' : 'en';
    } catch {
      storageFailed = true;
    }

    document.documentElement.lang = selectedLocale;
  },

  setLocale(locale: InterfaceLocale): void {
    selectedLocale = locale;
    storageFailed = false;
    try {
      localStorage.setItem(storageKey, locale);
    } catch {
      storageFailed = true;
    }

    document.documentElement.lang = locale;
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },

  snapshot(): InterfaceLocale {
    return selectedLocale;
  },

  translate(message: string, parameters: Readonly<Record<string, TextOrNumber>> = {}): string {
    const translated =
      selectedLocale === 'ru'
        ? (InterfaceTranslations[message] ?? ConfigurationTranslations[message] ?? message)
        : message;

    return translated.replace(/\{(\w+)\}/g, (placeholder: string, key: string) =>
      Object.hasOwn(parameters, key) ? String(parameters[key]) : placeholder,
    );
  },
};
