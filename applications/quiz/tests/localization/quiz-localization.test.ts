import { isString } from 'es-toolkit';
import { describe, expect, it } from 'vitest';
import { QuizLocalization } from '../../source/localization/quiz-localization';
import { QuizRussianContent } from '../../source/localization/quiz-content-translations';
import { readFileSync } from 'node:fs';

const ConfigurationContent = {
  collect(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.flatMap(ConfigurationContent.collect);
    }

    if (!value || typeof value !== 'object') {
      return [];
    }

    return Object.entries(value).flatMap(([key, content]) => {
      if (
        [
          'title',
          'body',
          'eyebrow',
          'helperText',
          'primaryActionLabel',
          'label',
          'summary',
          'unit',
        ].includes(key) &&
        isString(content)
      ) {
        return [content];
      }

      if (key === 'recommendations' && Array.isArray(content)) {
        return content.filter((item): item is string => isString(item));
      }

      return ConfigurationContent.collect(content);
    });
  },
};

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
    const originals = ['funnel-v1.json', 'funnel-v2.json', 'funnel-v3.json'];

    for (const filename of originals) {
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
