export const QuizLocales = { English: 'en', Russian: 'ru' } as const;

export type QuizLocale = (typeof QuizLocales)[keyof typeof QuizLocales];

export interface QuizLocaleContextValue {
  readonly locale: QuizLocale;
  readonly changeLocale: (locale: QuizLocale) => void;
  readonly storageAvailable: boolean;
}
