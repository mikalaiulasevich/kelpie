'use client';

import { QuizContent } from '../source/experience/quiz-content';

import { useQuizLocale } from '../source/localization/quiz-locale-provider';
import { Button } from '../source/components/button';
import { KelpieMark } from '../source/components/kelpie-mark';

export default function QuizNotFound() {
  const { translate } = useQuizLocale();

  return (
    <main className="quiz-loading">
      <KelpieMark />
      <h1>{translate(QuizContent.NotFound.Title)}</h1>
      <p>{translate(QuizContent.NotFound.Description)}</p>
      <Button asChild>
        <a href="/">{translate(QuizContent.NotFound.Return)}</a>
      </Button>
    </main>
  );
}
