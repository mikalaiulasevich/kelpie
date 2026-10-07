import { QuizLocales } from './quiz-localization-types';

export const QuizLocalizationPolicy = {
  StorageKey: 'kelpie.quiz.locale',
  DefaultLocale: QuizLocales.English,
} as const;
