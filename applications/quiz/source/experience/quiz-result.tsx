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
      <p className="eyebrow">{translate('YOUR TEAM’S NEXT CHAPTER')}</p>
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
        <span>{translate('Small changes. A practical place to start.')}</span>
      </div>
      {expanded && (
        <div className="recommendation-sheet" id="recommendations">
          <div className="recommendation-heading">
            <h2>{translate('Your action list')}</h2>
            <Button appearance="quiet" onClick={() => window.print()}>
              <Printer />
              {translate('Print')}
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
          <p className="result-footnote">
            {translate(
              'A fictional recommendation for this assessment. Use it as a conversation starter with your team.',
            )}
          </p>
        </div>
      )}
      <Button appearance="quiet" disabled={busy} onClick={() => void onBack()}>
        <ArrowLeft />
        {translate('Review your answers')}
      </Button>
    </section>
  );
}
