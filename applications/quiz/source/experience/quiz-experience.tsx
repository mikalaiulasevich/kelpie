'use client';

import { QuizPreview } from '../session/quiz-preview';
import { QuizContent } from './quiz-content';

import { RefreshCw } from 'lucide-react';
import { Button } from '../components/button';
import { KelpieMark } from '../components/kelpie-mark';
import { useQuizLocale } from '../localization/quiz-locale-provider';
import { useQuizSession } from '../session/use-quiz-session';
import { QuizShell } from './quiz-shell';
import { QuizSessionContent } from './quiz-session-content';

export function QuizExperience() {
  const { translate } = useQuizLocale();
  const session = useQuizSession();

  return (
    <QuizShell>
      {session.loading && (
        <div className="quiz-loading" role="status">
          <KelpieMark />
          <p>{translate(QuizContent.Shell.Loading)}</p>
          <div className="loading-line" />
        </div>
      )}
      {!session.loading && (
        <>
          {QuizPreview.active() && (
            <p className="delivery-note" role="status">
              {translate(QuizContent.Shell.Preview)}
            </p>
          )}
          {session.error && (
            <div className="quiz-alert" role="alert">
              <div>
                <strong>{translate(QuizContent.Shell.Recovery)}</strong>
                <p>{translate(session.error)}</p>
              </div>
              <Button
                appearance="secondary"
                disabled={session.busy}
                onClick={() => void session.retry()}
              >
                <RefreshCw />
                {translate(QuizContent.Actions.Retry)}
              </Button>
            </div>
          )}
          {session.expired && <p className="expiry-note">{translate(QuizContent.Shell.Expired)}</p>}
          <QuizSessionContent session={session} />
          {session.deliveryError && (
            <div className="delivery-note" role="status">
              {translate(session.deliveryError)}
              <Button appearance="quiet" onClick={() => void session.retry()}>
                {translate(QuizContent.Actions.RetryDelivery)}
              </Button>
            </div>
          )}
        </>
      )}
    </QuizShell>
  );
}
