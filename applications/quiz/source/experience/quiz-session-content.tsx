import { QuizPreview } from '../session/quiz-preview';
import { QuizContent } from './quiz-content';
import { Check } from 'lucide-react';
import { Button } from '../components/button';
import { KelpieMark } from '../components/kelpie-mark';
import { useQuizLocale } from '../localization/quiz-locale-provider';
import { QuizLocalization } from '../localization/quiz-localization';
import { QuizSessionEvaluation } from '../session/quiz-session-evaluation';
import type { QuizSessionController } from '../session/quiz-session-types';
import { QuizQuestion } from './quiz-question';
import { QuizResult } from './quiz-result';
import { QuizWelcome } from './quiz-welcome';
import { QuizMessages } from './quiz-messages';

interface QuizSessionContentProperties {
  readonly session: QuizSessionController;
}

export function QuizSessionContent({ session }: QuizSessionContentProperties) {
  const { translate, locale } = useQuizLocale();
  const state = session.state;
  const evaluation = state ? QuizSessionEvaluation.evaluate(state) : null;
  const stepIndex =
    evaluation?.route.steps.findIndex(
      (candidate) => candidate.id === state?.currentStepIdentifier,
    ) ?? 0;
  const step = evaluation?.route.steps[stepIndex];

  if (!state && QuizPreview.active()) {
    if (session.error) {
      return null;
    }

    return (
      <section className="quiz-alert" aria-labelledby="preview-unavailable">
        <div>
          <h1 id="preview-unavailable">{translate(QuizContent.Shell.PreviewUnavailable)}</h1>
          <p>{translate(QuizContent.Shell.PreviewRecovery)}</p>
        </div>
      </section>
    );
  }

  if (!state || step?.type === 'info') {
    return <QuizWelcome step={step} session={session} />;
  }

  const progress =
    state.progress.total > 0
      ? Math.min(100, (state.progress.completed / state.progress.total) * 100)
      : 0;

  return (
    <>
      {step && (
        <>
          <div
            className={step.type === 'result' ? 'quiz-progress result-progress' : 'quiz-progress'}
          >
            <div>
              <span>
                {step.type === 'result'
                  ? translate(QuizContent.Question.Ready)
                  : QuizLocalization.progress(
                      locale,
                      state.progress.completed,
                      state.progress.total,
                    )}
              </span>
              <span>
                {new Intl.NumberFormat(locale, {
                  style: 'percent',
                  maximumFractionDigits: 0,
                }).format(progress / 100)}
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={translate(QuizContent.Question.ProgressLabel)}
              aria-valuenow={state.progress.completed}
              aria-valuemax={state.progress.total}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          {step.type === 'result' && state.result && (
            <QuizResult
              key={`${state.sessionIdentifier}:${state.revision}`}
              result={state.result}
              busy={session.busy}
              onBack={session.back}
              onAction={session.recordResultAction}
            />
          )}
          {step.type === 'result' && !state.result && (
            <div className="quiz-alert">
              <p>{translate(QuizMessages.ResultPending)}</p>
              <Button onClick={() => void session.back()}>
                {translate(QuizContent.Actions.Back)}
              </Button>
            </div>
          )}
          {step.type !== 'result' && (
            <div className="question-layout">
              <aside className="question-context">
                <span className="eyebrow">{translate(QuizContent.Question.ContextEyebrow)}</span>
                <h2>
                  {translate(QuizContent.Question.ContextTitle)}
                  <br />
                  <em>{translate(QuizContent.Question.ContextEmphasis)}</em>
                </h2>
                <p>{translate(QuizContent.Question.ContextDescription)}</p>
                <div className="context-note">
                  <Check />
                  <span>{translate(QuizContent.Question.ReviewReminder)}</span>
                </div>
                <div className="context-brand">
                  <KelpieMark />
                  <span>
                    {translate(QuizContent.Question.BrandLine)}
                    <br />
                    {translate(QuizContent.Question.BrandEmphasis)}
                  </span>
                </div>
              </aside>
              <QuizQuestion
                key={`${state.sessionIdentifier}:${step.id}:${state.revision}`}
                state={state}
                step={step}
                busy={session.busy}
                canGoBack={stepIndex > 0}
                onContinue={session.continueStep}
                onBack={session.back}
              />
            </div>
          )}
        </>
      )}
      {!step && (
        <div className="quiz-alert">
          <p>{translate(QuizMessages.MissingStep)}</p>
          <Button onClick={() => void session.retry()}>
            {translate(QuizContent.Actions.RefreshSession)}
          </Button>
        </div>
      )}
    </>
  );
}
