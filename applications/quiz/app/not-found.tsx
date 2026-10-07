'use client';

import { useQuizLocale } from '../source/localization/quiz-locale-provider';
import { Button } from '../source/components/button';
import { KelpieMark } from '../source/components/kelpie-mark';

export default function QuizNotFound() {
  const { translate } = useQuizLocale();

  return (
    <main className="quiz-loading">
      <KelpieMark />
      <h1>{translate('Page not found')}</h1>
      <p>{translate('This link does not lead to an assessment page.')}</p>
      <Button asChild>
        <a href="/">{translate('Return to assessment')}</a>
      </Button>
    </main>
  );
}
