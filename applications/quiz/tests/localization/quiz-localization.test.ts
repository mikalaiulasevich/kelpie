import { ConfigurationContent } from '../fixtures/configuration-content';
import { LocalizationCases } from '../cases/localization-cases';
import { describe, expect, it } from 'vitest';
import { QuizLocalization } from '../../source/localization/quiz-localization';
import { QuizRussianContent } from '../../source/localization/quiz-content-translations';
import { readFileSync } from 'node:fs';

describe('Quiz localization', () => {
  it('accepts only supported preferences and falls back to English', () => {
    expect(QuizLocalization.resolve('ru')).toBe('ru');
    expect(QuizLocalization.resolve('en')).toBe('en');
    expect(QuizLocalization.resolve('unexpected')).toBe('en');
    expect(QuizLocalization.resolve(null)).toBe('en');
  });

  it('translates presentation without changing unfamiliar authored content', () => {
    expect(QuizLocalization.translate('ru', 'Continue')).toBe('Продолжить');
    expect(QuizLocalization.translate('en', 'Continue')).toBe('Continue');
    expect(QuizLocalization.translate('ru', 'My custom question')).toBe('My custom question');
    expect(QuizLocalization.translate('ru', 'toString')).toBe('toString');
  });

  it('covers all supplied configuration display content without editing configuration documents', () => {
    for (const filename of LocalizationCases.ConfigurationFiles) {
      const configuration: unknown = JSON.parse(
        readFileSync(new URL(`../../../../configurations/${filename}`, import.meta.url), 'utf8'),
      );
      const content = ConfigurationContent.collect(configuration);

      expect(content.length).toBeGreaterThan(30);
      for (const text of content) {
        expect(Object.hasOwn(QuizRussianContent, text), text).toBe(true);
      }
    }
  });

  it('uses current values in translated progress and validation', () => {
    expect(QuizLocalization.progress('ru', 3, 9)).toBe('Завершено вопросов: 3 из 9');
    expect(QuizLocalization.validation('ru', 'Enter at least 4.')).toBe('Введите не меньше 4.');
    expect(QuizLocalization.validation('ru', 'An answer is required.')).toBe('Ответьте на вопрос.');
    expect(QuizLocalization.validation('en', 'Enter at least 4.')).toBe('Enter at least 4.');
  });
});
