import { QuizRussianMessages } from './quiz-translations';
import { QuizRussianContent } from './quiz-content-translations';

export const QuizLocales = { English: 'en', Russian: 'ru' } as const;

export type QuizLocale = (typeof QuizLocales)[keyof typeof QuizLocales];

const translations: Readonly<Record<string, string>> = {
  ...QuizRussianMessages,
  ...QuizRussianContent,
};

export const QuizLocalization = {
  StorageKey: 'kelpie.quiz.locale',

  resolve(value: string | null): QuizLocale {
    return value === QuizLocales.Russian ? QuizLocales.Russian : QuizLocales.English;
  },

  translate(locale: QuizLocale, text: string): string {
    if (locale === QuizLocales.English) {
      return text;
    }

    return Object.hasOwn(translations, text) ? (translations[text] ?? text) : text;
  },

  progress(locale: QuizLocale, completed: number, total: number): string {
    const formatter = new Intl.NumberFormat(locale);

    return locale === QuizLocales.Russian
      ? `Завершено вопросов: ${formatter.format(completed)} из ${formatter.format(total)}`
      : `${formatter.format(completed)} of ${formatter.format(total)} questions complete`;
  },

  selections(locale: QuizLocale, minimum: number, maximum: number): string {
    return locale === QuizLocales.Russian
      ? `Выберите ${minimum}–${maximum} вариантов. Здесь нет правильных или неправильных ответов.`
      : `Choose ${minimum}–${maximum} options. There are no right or wrong answers.`;
  },

  validation(locale: QuizLocale, text: string): string {
    if (locale === QuizLocales.English) {
      return text;
    }

    const patterns = [
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
    ];

    for (const pattern of patterns) {
      const value = pattern.expression.exec(text)?.[1];

      if (value) {
        return pattern.format(value);
      }
    }

    return QuizLocalization.translate(locale, text);
  },
};
