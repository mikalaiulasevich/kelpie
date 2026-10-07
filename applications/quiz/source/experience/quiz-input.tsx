import { QuizAnswerInput } from './quiz-answer-input';
import { QuizExperiencePolicy } from './quiz-experience-policy';

import { QuizContent } from './quiz-content';
import { useQuizLocale } from '../localization/quiz-locale-provider';
import type { InteractiveStep, StepAnswer } from '@kelpie/contracts';
import { Check, Minus, Plus } from 'lucide-react';
import { isNumber } from 'es-toolkit/predicate';
import { Button } from '../components/button';

interface QuizInputProperties {
  readonly step: InteractiveStep;
  readonly value: StepAnswer | null;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly onChange: (value: StepAnswer | null) => void;
}

export function QuizInput({ step, value, disabled, invalid, onChange }: QuizInputProperties) {
  const { translate } = useQuizLocale();

  if (step.type === 'number') {
    const numericValue = isNumber(value) ? value : step.input.min;

    return (
      <fieldset
        className="number-field"
        disabled={disabled}
        aria-describedby="question-help question-error"
      >
        <legend className="sr-only">{translate(step.content.title)}</legend>
        <label htmlFor="number-answer" className="input-label">
          {translate(QuizContent.Input.Answer)}
          {step.input.unit && <span>· {translate(step.input.unit ?? '')}</span>}
        </label>
        <div className="number-control">
          <Button
            appearance="secondary"
            type="button"
            aria-label={translate(QuizContent.Input.Decrease)}
            disabled={numericValue <= step.input.min}
            onClick={() => onChange(QuizAnswerInput.adjust(step, value, -1))}
          >
            <Minus />
          </Button>
          <input
            id="number-answer"
            type="number"
            inputMode="decimal"
            min={step.input.min}
            max={step.input.max}
            step={step.input.step}
            value={isNumber(value) ? value : ''}
            placeholder="—"
            aria-invalid={invalid}
            onChange={(event) =>
              onChange(event.target.value === '' ? null : event.target.valueAsNumber)
            }
          />
          <Button
            appearance="secondary"
            type="button"
            aria-label={translate(QuizContent.Input.Increase)}
            disabled={numericValue >= step.input.max}
            onClick={() => onChange(QuizAnswerInput.adjust(step, value, 1))}
          >
            <Plus />
          </Button>
        </div>
        <input
          className="number-slider"
          aria-label={translate(QuizContent.Input.Adjust)}
          type="range"
          min={step.input.min}
          max={step.input.max}
          step={step.input.step}
          value={numericValue}
          onChange={(event) => onChange(event.target.valueAsNumber)}
        />
        <div className="range-labels">
          <span>
            {step.input.min} {translate(step.input.unit ?? '')}
          </span>
          <span>
            {step.input.max} {translate(step.input.unit ?? '')}
          </span>
        </div>
      </fieldset>
    );
  }

  const multiple = step.type === 'multi-select';

  return (
    <fieldset
      className="choice-field"
      disabled={disabled}
      aria-describedby="question-help question-error"
    >
      <legend className="sr-only">{translate(step.content.title)}</legend>
      {step.input.options.map((option, index) => {
        const checked = multiple
          ? Array.isArray(value) && value.includes(option.value)
          : value === option.value;

        return (
          <label className="choice-option" key={option.value} data-checked={checked}>
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={step.input.name}
              value={option.value}
              checked={checked}
              aria-invalid={invalid}
              onChange={() => {
                if (!multiple) {
                  onChange(option.value);

                  return;
                }

                onChange(QuizAnswerInput.toggle(value, option.value));
              }}
            />
            <span className="choice-indicator" data-multiple={multiple} aria-hidden="true">
              {checked && <Check />}
            </span>
            <span className="choice-label">{translate(option.label)}</span>
            <kbd aria-hidden="true">
              {index < QuizExperiencePolicy.MaximumShortcutOptions ? index + 1 : ''}
            </kbd>
          </label>
        );
      })}
    </fieldset>
  );
}
