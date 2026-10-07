import { describe, expect, it, vi } from 'vitest';
import { LocalizationFixtures } from '../fixtures/localization-fixtures';
import { LocalizationCases } from '../cases/localization-cases';

describe('Administration interface localization', () => {
  it.each(LocalizationCases.Preferences)(
    'restores $stored as $expected with matching document language',
    async ({ stored, expected, formatting }) => {
      const { localization, document } = await LocalizationFixtures.create(stored);

      localization.initialize();

      expect(localization.locale).toBe(expected);
      expect(localization.snapshot()).toBe(expected);
      expect(localization.formattingLocale).toBe(formatting);
      expect(document.documentElement.lang).toBe(expected);
    },
  );

  it('persists language and updates subscribers and document language', async () => {
    const { localization, storage, document } = await LocalizationFixtures.create();
    const changed = vi.fn();
    const unsubscribe = localization.subscribe(changed);
    localization.initialize();

    localization.setLocale('ru');

    expect(storage.setItem).toHaveBeenCalledWith('kelpie.administration.language', 'ru');
    expect(localization.locale).toBe('ru');
    expect(document.documentElement.lang).toBe('ru');
    expect(changed).toHaveBeenCalledOnce();
    unsubscribe();
    localization.setLocale('en');
    expect(changed).toHaveBeenCalledOnce();
    localization.setLocale('ru');
    vi.resetModules();
    const reloaded = await import('../../source/localization/localization');
    reloaded.Localization.initialize();

    expect(reloaded.Localization.locale).toBe('ru');
  });

  it('keeps the chosen language usable if persistence fails and clears the failure after recovery', async () => {
    const { localization, storage, document } = await LocalizationFixtures.create();
    localization.initialize();
    storage.setItem.mockImplementationOnce(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });

    localization.setLocale('ru');

    expect(localization.storageFailed).toBe(true);
    expect(localization.locale).toBe('ru');
    expect(document.documentElement.lang).toBe('ru');
    expect(localization.translate('Settings')).toBe('Настройки');
    localization.setLocale('en');
    expect(localization.storageFailed).toBe(false);
  });

  it('falls back to English when reading browser storage fails', async () => {
    const { localization, storage, document } = await LocalizationFixtures.create();
    storage.getItem.mockImplementationOnce(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });

    localization.initialize();

    expect(localization.locale).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(localization.storageFailed).toBe(true);
    localization.initialize();
    expect(localization.storageFailed).toBe(false);
  });

  it('interpolates translated labels without translating identifiers or interpreting replacement syntax', async () => {
    const { localization } = await LocalizationFixtures.create('ru');
    localization.initialize();
    const parameters = { identifier: 'workstyle-planner_$&_{version}' };

    expect(localization.translate('View version {identifier}', parameters)).toBe(
      'Открыть версию workstyle-planner_$&_{version}',
    );
    expect(parameters.identifier).toBe('workstyle-planner_$&_{version}');
    expect(
      localization.translate('Participants can choose {minimum}–{maximum} answers.', {
        minimum: 1,
        maximum: 3,
      }),
    ).toBe('Участник может выбрать от 1 до 3 ответов.');
    expect(localization.translate('Details for version {version}')).toBe(
      'Подробности версии {version}',
    );
    localization.setLocale('en');
    expect(localization.translate('View version {identifier}', parameters)).toBe(
      'View version workstyle-planner_$&_{version}',
    );
  });

  it.each(LocalizationCases.CustomContent)(
    'preserves unmapped custom content %s',
    async (content) => {
      const { localization } = await LocalizationFixtures.create('ru');
      localization.initialize();

      expect(localization.translate(content)).toBe(content);
    },
  );

  it('translates administration and analytics failures from their message catalogs', async () => {
    const { localization } = await LocalizationFixtures.create('ru');
    localization.initialize();

    expect(localization.translate('The username or password is incorrect.')).toBe(
      'Неверное имя пользователя или пароль.',
    );
    expect(
      localization.translate('Analytics could not be loaded. Check your connection and try again.'),
    ).toBe('Не удалось загрузить аналитику. Проверьте соединение и попробуйте снова.');
  });

  it('formats actual numeric counts and ratios with the selected locale', async () => {
    const { localization, formatting } = await LocalizationFixtures.create('ru');
    localization.initialize();

    expect(formatting.count(12345)).toBe('12\u00a0345');
    expect(formatting.ratio({ numerator: 429, denominator: 1000, value: 0.429 })).toBe(
      '42,9\u00a0%',
    );
    localization.setLocale('en');
    expect(formatting.count(12345)).toBe('12,345');
    expect(formatting.ratio({ numerator: 429, denominator: 1000, value: 0.429 })).toBe('42.9%');
    expect(formatting.ratio({ numerator: 0, denominator: 0, value: null })).toBe('Not applicable');
  });
});
