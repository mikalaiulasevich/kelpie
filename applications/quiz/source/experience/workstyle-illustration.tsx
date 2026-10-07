import { QuizContent } from './quiz-content';
import { useQuizLocale } from '../localization/quiz-locale-provider';
import { ArrowUpRight, Check, CircleDot, GitBranch, Users } from 'lucide-react';

export function WorkstyleIllustration() {
  const { translate } = useQuizLocale();

  return (
    <div
      className="workstyle-illustration"
      aria-label={translate(QuizContent.Illustration.Description)}
      role="img"
    >
      <div className="illustration-orbit orbit-one" />
      <div className="illustration-orbit orbit-two" />
      <div className="illustration-note">
        <span className="note-symbol">
          <Users />
        </span>
        <span>
          {translate(QuizContent.Illustration.BuiltAround)}
          <br />
          <strong>{translate(QuizContent.Illustration.People)}</strong>
        </span>
      </div>
      <div className="illustration-paper">
        <div className="paper-top">
          <span className="mini-eyebrow">{translate(QuizContent.Illustration.Eyebrow)}</span>
          <ArrowUpRight />
        </div>
        <h2>
          {translate(QuizContent.Welcome.TeamHeadline)}
          <br />
          {translate(QuizContent.Illustration.Working)}
        </h2>
        <div className="paper-line">
          <CircleDot />
          <span>{translate(QuizContent.Illustration.Together)}</span>
          <Check />
        </div>
        <div className="paper-line">
          <CircleDot />
          <span>{translate(QuizContent.Illustration.Change)}</span>
          <Check />
        </div>
        <div className="paper-line">
          <CircleDot />
          <span>{translate(QuizContent.Illustration.Start)}</span>
          <Check />
        </div>
        <div className="paper-result">
          <GitBranch />
          <div>
            <small>{translate(QuizContent.Illustration.NextStep)}</small>
            <strong>{translate(QuizContent.Illustration.Plan)}</strong>
          </div>
        </div>
      </div>
      <span className="illustration-stamp">
        {translate(QuizContent.Illustration.StampTitle)}
        <br />
        <span>{translate(QuizContent.Illustration.StampEmphasis)}</span>
      </span>
    </div>
  );
}
