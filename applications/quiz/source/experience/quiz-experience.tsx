'use client';
import { useQuizLocale } from '../localization/quiz-locale-provider';

import {
  ArrowRight,
  Check,
  GitBranch,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/button';
import { KelpieMark } from '../components/kelpie-mark';
import { useQuizSession } from '../session/use-quiz-session';
import { QuizSessionApi } from '../session/quiz-session-api';
import { QuizQuestion } from './quiz-question';
import { QuizResult } from './quiz-result';
import { WorkstyleIllustration } from './workstyle-illustration';
import { QuizSettings } from '../localization/quiz-settings';
import { QuizLocalization } from '../localization/quiz-localization';
import { QuizMessages } from './quiz-messages';

export function QuizExperience() {
  const { translate, locale } = useQuizLocale();

  const session = useQuizSession();
  const [showAbout, setShowAbout] = useState(false);
  const state = session.state;
  const evaluation = state ? QuizSessionApi.evaluate(state) : null;
  const step = evaluation?.route.steps.find(
    (candidate) => candidate.id === state?.currentStepIdentifier,
  );
  const stepIndex =
    evaluation?.route.steps.findIndex(
      (candidate) => candidate.id === state?.currentStepIdentifier,
    ) ?? 0;
  const progress =
    state && state.progress.total > 0
      ? Math.min(100, (state.progress.completed / state.progress.total) * 100)
      : 0;
  const welcome = !state || step?.type === 'info';

  return (
    <div className="quiz-app">
      <a className="skip-link" href="#quiz-main">
        {translate('Skip to assessment')}
      </a>
      <header className="quiz-header">
        <a className="quiz-brand" href="/" aria-label={translate('Kelpie workstyle home')}>
          <KelpieMark />
          <span>kelpie</span>
        </a>
        <span className="header-divider" />
        <span className="header-context">{translate('Workstyle check')}</span>
        <Button
          appearance="quiet"
          onClick={() => setShowAbout(!showAbout)}
          aria-expanded={showAbout}
          aria-controls="quiz-about"
        >
          {translate('How it works')}
          <GitBranch />
        </Button>
        <QuizSettings />
      </header>
      {showAbout && (
        <section id="quiz-about" className="about-assessment">
          <p>{translate('This assessment uses demonstration content, not professional advice.')}</p>
          <strong>{translate('A little reflection. A clearer direction.')}</strong>
          <p>
            {translate(
              'Answer a few questions about your team. Your answers shape the route and the final recommendation. You can go back to make changes; a new answer is confirmed only with Continue.',
            )}
          </p>
          <p>
            {translate(
              'Your unfinished inputs are kept in this browser. The session is tied to the same configuration and variant throughout.',
            )}
          </p>
        </section>
      )}
      <main id="quiz-main">
        {session.loading && (
          <div className="quiz-loading" role="status">
            <KelpieMark />
            <p>{translate('Getting everything ready…')}</p>
            <div className="loading-line" />
          </div>
        )}
        {!session.loading && (
          <>
            {session.error && (
              <div className="quiz-alert" role="alert">
                <div>
                  <strong>{translate('Let’s get you back on track.')}</strong>
                  <p>{translate(session.error)}</p>
                </div>
                <Button
                  appearance="secondary"
                  disabled={session.busy}
                  onClick={() => void session.retry()}
                >
                  <RefreshCw />
                  {translate('Try again')}
                </Button>
              </div>
            )}
            {session.expired && (
              <p className="expiry-note">
                {translate(
                  'Your previous session has expired. Start again for a fresh recommendation.',
                )}
              </p>
            )}
            {welcome && (
              <div className="welcome-layout">
                <div className="welcome-copy">
                  <span className="eyebrow">
                    {step?.content.eyebrow
                      ? translate(step.content.eyebrow)
                      : translate('GOOD WORK STARTS WITH YOUR PEOPLE')}
                  </span>
                  <h1>
                    {step?.content.title ? (
                      translate(step.content.title)
                    ) : (
                      <>
                        {translate('Your team.')}
                        <br />
                        {translate('A better way')} <em>{translate('to work.')}</em>
                      </>
                    )}
                  </h1>
                  <p>
                    {step?.content.body
                      ? translate(step.content.body)
                      : translate(
                          'Find a work model that fits the way your team actually works. A few thoughtful questions. One practical direction.',
                        )}
                  </p>
                  <Button
                    disabled={session.busy || Boolean(session.error)}
                    onClick={() => {
                      if (state) {
                        void session.continueStep();

                        return;
                      }

                      const parameters = new URLSearchParams(window.location.search);
                      void session.start(
                        parameters.get('funnel') ?? 'workstyle-planner',
                        window.location.search,
                      );
                    }}
                  >
                    {session.busy
                      ? translate('Getting ready…')
                      : translate(step?.content.primaryActionLabel ?? 'Find your workstyle')}
                    <ArrowRight />
                  </Button>
                  <div className="welcome-reassurance">
                    <LockKeyhole />
                    <span>{translate('No account needed')}</span>
                    <span className="reassurance-dot" />
                    <span>{translate('Go at your own pace')}</span>
                  </div>
                </div>
                <WorkstyleIllustration />
                <div className="welcome-stages">
                  <div>
                    <span>01</span>
                    <Users />
                    <strong>{translate('Your team')}</strong>
                    <p>{translate('Tell us how you work today.')}</p>
                  </div>
                  <div>
                    <span>02</span>
                    <ListChecks />
                    <strong>{translate('Your priorities')}</strong>
                    <p>{translate('Reflect on what matters most.')}</p>
                  </div>
                  <div>
                    <span>03</span>
                    <Sparkles />
                    <strong>{translate('Your direction')}</strong>
                    <p>{translate('Leave with a practical next step.')}</p>
                  </div>
                </div>
              </div>
            )}
            {!welcome && state && step && (
              <>
                <div
                  className={
                    step.type === 'result' ? 'quiz-progress result-progress' : 'quiz-progress'
                  }
                >
                  <div>
                    <span>
                      {step.type === 'result'
                        ? translate('Your recommendation is ready')
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
                    aria-label={translate('Questions complete')}
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
                    <Button onClick={() => void session.back()}>{translate('Back')}</Button>
                  </div>
                )}
                {step.type !== 'result' && (
                  <div className="question-layout">
                    <aside className="question-context">
                      <span className="eyebrow">{translate('THE WORKSTYLE CHECK')}</span>
                      <h2>
                        {translate('A little context.')}
                        <br />
                        <em>{translate('A clearer picture.')}</em>
                      </h2>
                      <p>
                        {translate(
                          'Think about your team as it is today, rather than how you’d like it to be.',
                        )}
                      </p>
                      <div className="context-note">
                        <Check />
                        <span>{translate('You can review your answers before you’re done.')}</span>
                      </div>
                      <div className="context-brand">
                        <KelpieMark />
                        <span>
                          {translate('Made for the way')}
                          <br />
                          {translate('you work.')}
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
            {!welcome && (!state || !step) && (
              <div className="quiz-alert">
                <p>{translate(QuizMessages.MissingStep)}</p>
                <Button onClick={() => void session.retry()}>{translate('Refresh session')}</Button>
              </div>
            )}
            {session.deliveryError && (
              <div className="delivery-note" role="status">
                {translate(session.deliveryError)}
                <Button appearance="quiet" onClick={() => void session.retry()}>
                  {translate('Retry delivery')}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="quiz-footer">
        <span>{translate('Thoughtful questions. Practical direction.')}</span>
        <span>
          Kelpie <span aria-hidden="true">·</span>
          {translate('Workstyle assessment')}
        </span>
      </footer>
    </div>
  );
}
