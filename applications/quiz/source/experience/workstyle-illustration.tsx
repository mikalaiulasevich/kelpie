import { useQuizLocale } from '../localization/quiz-locale-provider';
import { ArrowUpRight, Check, CircleDot, GitBranch, Users } from 'lucide-react';

export function WorkstyleIllustration() {
  const { translate } = useQuizLocale();

  return (
    <div
      className="workstyle-illustration"
      aria-label={translate('From your team’s answers to a practical workstyle recommendation')}
      role="img"
    >
      <div className="illustration-orbit orbit-one" />
      <div className="illustration-orbit orbit-two" />
      <div className="illustration-note">
        <span className="note-symbol">
          <Users />
        </span>
        <span>
          {translate('Built around')}
          <br />
          <strong>{translate('your people.')}</strong>
        </span>
      </div>
      <div className="illustration-paper">
        <div className="paper-top">
          <span className="mini-eyebrow">{translate('A LITTLE CLARITY')}</span>
          <ArrowUpRight />
        </div>
        <h2>
          {translate('Your team.')}
          <br />
          {translate('Your way of working.')}
        </h2>
        <div className="paper-line">
          <CircleDot />
          <span>{translate('How you work together')}</span>
          <Check />
        </div>
        <div className="paper-line">
          <CircleDot />
          <span>{translate('What needs to change')}</span>
          <Check />
        </div>
        <div className="paper-line">
          <CircleDot />
          <span>{translate('Where to start')}</span>
          <Check />
        </div>
        <div className="paper-result">
          <GitBranch />
          <div>
            <small>{translate('THE NEXT STEP')}</small>
            <strong>{translate('A plan that fits.')}</strong>
          </div>
        </div>
      </div>
      <span className="illustration-stamp">
        {translate('LESS GUESSWORK')}
        <br />
        <span>{translate('more direction')}</span>
      </span>
    </div>
  );
}
