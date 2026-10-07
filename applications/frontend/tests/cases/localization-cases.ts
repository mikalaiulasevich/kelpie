export const LocalizationCases = {
  Preferences: [
    { stored: 'ru', expected: 'ru', formatting: 'ru-RU' },
    { stored: 'en', expected: 'en', formatting: 'en-US' },
    { stored: 'fr', expected: 'en', formatting: 'en-US' },
    { stored: '', expected: 'en', formatting: 'en-US' },
    { stored: null, expected: 'en', formatting: 'en-US' },
  ],
  CustomContent: ['custom_funnel_01', 'A/B: team_size', 'toString', 'constructor', '__proto__'],
} as const;
