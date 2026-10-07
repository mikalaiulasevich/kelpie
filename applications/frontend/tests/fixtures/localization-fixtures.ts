import { isNull } from 'es-toolkit';
import { vi } from 'vitest';

export const LocalizationFixtures = {
  async create(storedLanguage: string | null = null) {
    vi.resetModules();
    const values = new Map<string, string>();

    if (!isNull(storedLanguage)) {
      values.set('kelpie.administration.language', storedLanguage);
    }

    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };
    const document = { documentElement: { lang: '' } };
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('document', document);
    const { Localization } = await import('../../source/localization/localization');
    const { AnalyticsFormat } = await import('../../source/analytics/analytics-format');

    return { localization: Localization, formatting: AnalyticsFormat, storage, document, values };
  },
};
