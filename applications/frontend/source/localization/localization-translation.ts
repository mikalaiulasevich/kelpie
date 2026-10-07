import { AdditionalTranslations } from './additional-translations';
import { ConfigurationTranslations } from './configuration-translations';
import { InterfaceTranslations } from './interface-translations';
import { InterfaceLocale, type TranslationParameters } from './localization-types';

// Catalog precedence is explicit; supplied/custom text falls back unchanged.
const catalogs = [InterfaceTranslations, ConfigurationTranslations, AdditionalTranslations];

export const LocalizationTranslation = {
  resolve(locale: InterfaceLocale, message: string): string {
    if (locale === InterfaceLocale.English) {
      return message;
    }

    const catalog = catalogs.find((translations) => Object.hasOwn(translations, message));

    return catalog?.[message] ?? message;
  },

  interpolate(message: string, parameters: TranslationParameters): string {
    return message.replace(/\{(\w+)\}/g, (placeholder: string, key: string) =>
      Object.hasOwn(parameters, key) ? String(parameters[key]) : placeholder,
    );
  },
} as const;
