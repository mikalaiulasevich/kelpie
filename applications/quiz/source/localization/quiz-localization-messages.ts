export const QuizLocalizationMessages = {
  Settings: {
    Title: 'Settings',
    Language: 'Language',
    Saved: 'Language is saved in this browser. Your answers stay unchanged.',
    OriginalContent:
      'Custom configuration content is shown in its original language when a translation is unavailable.',
    Unavailable: 'Language could not be saved. It will reset when this page is refreshed.',
  },
  Titles: { en: 'Your team, working better | Kelpie', ru: 'Стиль работы команды | Kelpie' },
  Validation: [
    {
      expression: /^Enter at least (.+)\.$/,
      format: (value: string) => `Введите не меньше ${value}.`,
    },
    {
      expression: /^Enter no more than (.+)\.$/,
      format: (value: string) => `Введите не больше ${value}.`,
    },
    {
      expression: /^Use increments of (.+)\.$/,
      format: (value: string) => `Используйте шаг ${value}.`,
    },
    {
      expression: /^Choose at least (.+) options\.$/,
      format: (value: string) => `Выберите не меньше ${value} вариантов.`,
    },
  ],
} as const;
