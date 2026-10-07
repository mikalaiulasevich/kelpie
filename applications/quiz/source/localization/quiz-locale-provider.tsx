'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { QuizLocaleStore } from './quiz-locale-store';
import { QuizLocalization } from './quiz-localization';
import { QuizLocalizationMessages } from './quiz-localization-messages';
import { QuizLocalizationPolicy } from './quiz-localization-policy';
import type { QuizLocale, QuizLocaleContextValue } from './quiz-localization-types';

const QuizLocaleContext = createContext<QuizLocaleContextValue>({
  locale: QuizLocalizationPolicy.DefaultLocale,
  changeLocale: () => undefined,
  storageAvailable: true,
});

export function QuizLocaleProvider({ children }: UIPropertiesWithChildren) {
  const locale = useSyncExternalStore(
    QuizLocaleStore.subscribe,
    QuizLocaleStore.read,
    QuizLocaleStore.serverSnapshot,
  );
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const changeLocale = (value: QuizLocale) => {
    setStorageAvailable(QuizLocaleStore.write(value));
  };

  return (
    <QuizLocaleContext value={{ locale, changeLocale, storageAvailable }}>
      <title>{QuizLocalizationMessages.Titles[locale]}</title>
      {children}
    </QuizLocaleContext>
  );
}

export function useQuizLocale() {
  const context = useContext(QuizLocaleContext);
  const translate = (text: string) => QuizLocalization.translate(context.locale, text);

  return { ...context, translate };
}
