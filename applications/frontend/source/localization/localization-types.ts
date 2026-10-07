import { Type, type Static } from 'typebox';

export const InterfaceLocale = { English: 'en', Russian: 'ru' } as const;

export const LocalizationSchemas = {
  Locale: Type.Enum(InterfaceLocale),
  Snapshot: Type.Object({ locale: Type.Enum(InterfaceLocale), storageFailed: Type.Boolean() }),
} as const;

export type InterfaceLocale = Static<typeof LocalizationSchemas.Locale>;

export type LocalizationSnapshot = Readonly<Static<typeof LocalizationSchemas.Snapshot>>;

export type TranslationParameters = ReadonlyDictionary<string, TextOrNumber>;
