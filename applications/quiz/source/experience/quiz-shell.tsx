import { QuizContent } from './quiz-content';
import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Button } from '../components/button';
import { KelpieMark } from '../components/kelpie-mark';
import { useQuizLocale } from '../localization/quiz-locale-provider';
import { QuizSettings } from '../localization/quiz-settings';

export function QuizShell({ children }: UIPropertiesWithChildren) {
  const { translate } = useQuizLocale();
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="quiz-app">
      <a className="skip-link" href="#quiz-main">
        {translate(QuizContent.Shell.Skip)}
      </a>
      <header className="quiz-header">
        <a className="quiz-brand" href="/" aria-label={translate(QuizContent.Shell.Home)}>
          <KelpieMark />
          <span>kelpie</span>
        </a>
        <span className="header-divider" />
        <span className="header-context">{translate(QuizContent.Shell.Context)}</span>
        <Button
          appearance="quiet"
          onClick={() => setShowAbout(!showAbout)}
          aria-expanded={showAbout}
          aria-controls="quiz-about"
        >
          {translate(QuizContent.Shell.About)}
          <GitBranch />
        </Button>
        <QuizSettings />
      </header>
      {showAbout && (
        <section id="quiz-about" className="about-assessment">
          <p>{translate(QuizContent.Shell.Disclaimer)}</p>
          <strong>{translate(QuizContent.Shell.AboutTitle)}</strong>
          <p>{translate(QuizContent.Shell.AboutDescription)}</p>
          <p>{translate(QuizContent.Shell.AboutPersistence)}</p>
        </section>
      )}
      <main id="quiz-main">{children}</main>
      <footer className="quiz-footer">
        <span>{translate(QuizContent.Shell.Footer)}</span>
        <span>
          Kelpie <span aria-hidden="true">·</span>
          {translate(QuizContent.Shell.Assessment)}
        </span>
      </footer>
    </div>
  );
}
