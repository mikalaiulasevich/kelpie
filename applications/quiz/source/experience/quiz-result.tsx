import { QuizContent } from './quiz-content';
import { useQuizLocale } from '../localization/quiz-locale-provider';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleCheck, Printer } from 'lucide-react';
import type { FunnelResult } from '@kelpie/contracts';
import { Button } from '../components/button';

interface QuizResultProperties {
  readonly result: FunnelResult;
  readonly busy: boolean;
  readonly onBack: () => Promise<void>;
  readonly onAction: () => Promise<void>;
}

export function QuizResult({ result, busy, onBack, onAction }: QuizResultProperties) {
  const { translate } = useQuizLocale();

  const [expanded, setExpanded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="result-panel">
      <span className="result-seal">
        <CircleCheck />
      </span>
      <p className="eyebrow">{translate(QuizContent.Result.Eyebrow)}</p>
      <h1 ref={heading} tabIndex={-1}>
        {translate(result.title)}
      </h1>
      <p className="result-summary">{translate(result.summary)}</p>
      <div className="result-action-area">
        <Button
          disabled={busy}
          onClick={() => {
            void onAction();
            setExpanded(true);
          }}
          aria-expanded={expanded}
          aria-controls="recommendations"
        >
          {translate(result.cta.label)}
          <ArrowRight />
        </Button>
        <span>{translate(QuizContent.Result.Reassurance)}</span>
      </div>
      {expanded && (
        <div className="recommendation-sheet" id="recommendations">
          <div className="recommendation-heading">
            <h2>{translate(QuizContent.Result.ActionsTitle)}</h2>
            <Button appearance="quiet" onClick={() => window.print()}>
              <Printer />
              {translate(QuizContent.Actions.Print)}
            </Button>
          </div>
          <ol>
            {result.recommendations.map((text, index) => (
              <li key={index}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{translate(text)}</p>
                <Check />
              </li>
            ))}
          </ol>
          <p className="result-footnote">{translate(QuizContent.Result.Disclaimer)}</p>
        </div>
      )}
      <Button appearance="quiet" disabled={busy} onClick={() => void onBack()}>
        <ArrowLeft />
        {translate(QuizContent.Result.Review)}
      </Button>
    </section>
  );
}
