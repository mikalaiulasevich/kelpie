'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { QuizLocaleStore } from './quiz-locale-store';
import { QuizLocalization, type QuizLocale } from './quiz-localization';

interface QuizLocaleContextValue {
  readonly locale: QuizLocale;
  readonly changeLocale: (locale: QuizLocale) => void;
  readonly storageAvailable: boolean;
}

const QuizLocaleContext = createContext<QuizLocaleContextValue>({
  locale: 'en',
  changeLocale: () => undefined,
  storageAvailable: true,
});

export function QuizLocaleProvider({ children }: { readonly children: ReactNode }) {
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
      <title>
        {locale === 'ru' ? 'Стиль работы команды | Kelpie' : 'Your team, working better | Kelpie'}
      </title>
      {children}
    </QuizLocaleContext>
  );
}

export function useQuizLocale() {
  const context = useContext(QuizLocaleContext);
  const translate = (text: string) => QuizLocalization.translate(context.locale, text);

  return { ...context, translate };
}
