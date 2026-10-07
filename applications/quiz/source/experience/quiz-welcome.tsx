import { QuizContent } from './quiz-content';
import type { FunnelStep } from '@kelpie/contracts';
import { ArrowRight, ListChecks, LockKeyhole, Sparkles, Users } from 'lucide-react';
import { Button } from '../components/button';
import { useQuizLocale } from '../localization/quiz-locale-provider';
import type { QuizSessionController } from '../session/quiz-session-types';
import { WorkstyleIllustration } from './workstyle-illustration';
import { QuizExperiencePolicy } from './quiz-experience-policy';

interface QuizWelcomeProperties {
  readonly step: Optional<FunnelStep>;
  readonly session: QuizSessionController;
}

export function QuizWelcome({ step, session }: QuizWelcomeProperties) {
  const { translate } = useQuizLocale();
  const state = session.state;

  return (
    <div className="welcome-layout">
      <div className="welcome-copy">
        <span className="eyebrow">
          {step?.content.eyebrow
            ? translate(step.content.eyebrow)
            : translate(QuizContent.Welcome.Eyebrow)}
        </span>
        <h1>
          {step?.content.title ? (
            translate(step.content.title)
          ) : (
            <>
              {translate(QuizContent.Welcome.TeamHeadline)}
              <br />
              {translate(QuizContent.Welcome.WorkHeadline)}{' '}
              <em>{translate(QuizContent.Welcome.WorkEmphasis)}</em>
            </>
          )}
        </h1>
        <p>
          {step?.content.body
            ? translate(step.content.body)
            : translate(QuizContent.Welcome.Description)}
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
              parameters.get(QuizExperiencePolicy.FunnelParameter) ??
                QuizExperiencePolicy.DefaultFunnel,
              window.location.search,
            );
          }}
        >
          {session.busy
            ? translate(QuizContent.Welcome.Starting)
            : translate(step?.content.primaryActionLabel ?? QuizContent.Welcome.Start)}
          <ArrowRight />
        </Button>
        <div className="welcome-reassurance">
          <LockKeyhole />
          <span>{translate(QuizContent.Welcome.NoAccount)}</span>
          <span className="reassurance-dot" />
          <span>{translate(QuizContent.Welcome.Pace)}</span>
        </div>
      </div>
      <WorkstyleIllustration />
      <div className="welcome-stages">
        <div>
          <span>01</span>
          <Users />
          <strong>{translate(QuizContent.Welcome.TeamTitle)}</strong>
          <p>{translate(QuizContent.Welcome.TeamDescription)}</p>
        </div>
        <div>
          <span>02</span>
          <ListChecks />
          <strong>{translate(QuizContent.Welcome.PrioritiesTitle)}</strong>
          <p>{translate(QuizContent.Welcome.PrioritiesDescription)}</p>
        </div>
        <div>
          <span>03</span>
          <Sparkles />
          <strong>{translate(QuizContent.Welcome.DirectionTitle)}</strong>
          <p>{translate(QuizContent.Welcome.DirectionDescription)}</p>
        </div>
      </div>
    </div>
  );
}
