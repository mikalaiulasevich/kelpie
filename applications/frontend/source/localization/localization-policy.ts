import { InterfaceLocale } from './localization-types';

export const LocalizationPolicy = {
  StorageKey: 'kelpie.administration.language',
  DefaultLocale: InterfaceLocale.English,
  FormattingLocales: {
    [InterfaceLocale.English]: 'en-US',
    [InterfaceLocale.Russian]: 'ru-RU',
  },
} as const;
