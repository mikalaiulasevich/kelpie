import { isUndefined } from 'es-toolkit';
import { useEffect, useRef, useState } from 'react';
import { StepRules, type FunnelStep, type StepAnswer } from '@kelpie/contracts';
import { AnswerValidation } from '@kelpie/funnel-runtime';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, ShieldCheck } from 'lucide-react';
import { QuizDrafts } from '../session/quiz-session-api';
import type { QuizSessionState } from '../session/quiz-session-types';
import { Button } from '../components/button';
import { QuizInput } from './quiz-input';
import { QuizMessages } from './quiz-messages';

interface QuizQuestionProperties {
  readonly state: QuizSessionState;
  readonly step: FunnelStep;
  readonly busy: boolean;
  readonly canGoBack: boolean;
  readonly onContinue: (answer?: StepAnswer | null) => Promise<void>;
  readonly onBack: () => Promise<void>;
}

const QuestionDraft = {
  read(state: QuizSessionState, step: FunnelStep) {
    const confirmed =
      state.answers.find((answer) => answer.stepIdentifier === step.id)?.value ?? null;

    try {
      const saved = QuizDrafts.read(state, step.id);

      return { value: isUndefined(saved) ? confirmed : saved, warning: '' };
    } catch {
      return { value: confirmed, warning: QuizMessages.DraftUnavailable };
    }
  },
};

export function QuizQuestion({
  state,
  step,
  busy,
  canGoBack,
  onContinue,
  onBack,
}: QuizQuestionProperties) {
  const [draft, setDraft] = useState(() => QuestionDraft.read(state, step));
  const [validation, setValidation] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const interactive = StepRules.isInteractive(step);
  const multiple = step.type === 'multi-select';
  const selectedCount = Array.isArray(draft.value) ? draft.value.length : 0;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  const changeAnswer = (value: StepAnswer | null) => {
    setValidation('');
    try {
      QuizDrafts.write(state, step.id, value);
      setDraft({ value, warning: '' });
    } catch {
      setDraft({ value, warning: QuizMessages.DraftUnavailable });
    }
  };

  const submit = async () => {
    if (busy) {
      return;
    }

    if (interactive) {
      const outcome = AnswerValidation.validate(step, draft.value);

      if (!outcome.valid) {
        setValidation(outcome.issues.map((issue) => issue.message).join(' '));

        return;
      }
    }

    await onContinue(interactive ? draft.value : undefined);
  };

  return (
    <form
      className="question-panel"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      onKeyDown={(event) => {
        if (
          busy ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          (event.target instanceof HTMLInputElement &&
            event.target.type !== 'radio' &&
            event.target.type !== 'checkbox') ||
          event.target instanceof HTMLTextAreaElement ||
          !/^[1-9]$/.test(event.key) ||
          (step.type !== 'single-select' && step.type !== 'multi-select')
        ) {
          return;
        }

        const option = step.input.options[Number(event.key) - 1];

        if (!option) {
          return;
        }

        event.preventDefault();
        if (step.type === 'single-select') {
          changeAnswer(option.value);

          return;
        }

        const previous = Array.isArray(draft.value) ? draft.value : [];
        changeAnswer(
          previous.includes(option.value)
            ? previous.filter((value) => value !== option.value)
            : [...previous, option.value],
        );
      }}
    >
      <div className="question-eyebrow">
        <span className="eyebrow">
          {interactive
            ? 'LET’S UNDERSTAND YOUR TEAM'
            : (step.content.eyebrow ?? 'A BETTER WAY TO WORK')}
        </span>
        {multiple && (
          <span className="selection-count">
            <Check />
            {selectedCount} selected
          </span>
        )}
      </div>
      <h1 ref={heading} tabIndex={-1}>
        {step.content.title}
      </h1>
      <p id="question-help" className="question-help">
        {step.content.helperText ??
          step.content.body ??
          'Choose the answer that feels closest to your team today.'}
      </p>
      {interactive && (
        <QuizInput
          step={step}
          value={draft.value}
          disabled={busy}
          invalid={Boolean(validation)}
          onChange={changeAnswer}
        />
      )}
      {multiple && (
        <p className="selection-help">
          Choose {StepRules.selectionLimits(step).minimum}–{StepRules.selectionLimits(step).maximum}{' '}
          options. There are no right or wrong answers.
        </p>
      )}
      <div id="question-error" role="alert" className="form-error">
        {validation}
      </div>
      {draft.warning && (
        <p role="status" className="form-warning">
          {draft.warning}
        </p>
      )}
      <div className="question-actions">
        <Button
          type="button"
          appearance="quiet"
          disabled={!canGoBack || busy}
          onClick={() => void onBack()}
        >
          <ArrowLeft />
          Back
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="spin" /> : null}
          {busy ? 'Saving…' : (step.content.primaryActionLabel ?? 'Continue')}
          <ArrowRight />
        </Button>
      </div>
      <p className="save-note">
        <ShieldCheck />
        Answers are confirmed only when you continue.
        <span className="keyboard-hint">
          Press <kbd>Enter ↵</kbd>
        </span>
      </p>
    </form>
  );
}
