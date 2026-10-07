import { useLocalization } from '../localization/use-localization';
import {
  StepRules,
  type FunnelConfiguration,
  type FunnelStep,
  type ExperimentVariant,
} from '@kelpie/contracts';
import { GitBranch, ListChecks, ArrowDown } from 'lucide-react';

interface ConfigurationStepMapProperties {
  readonly configuration: FunnelConfiguration;
  readonly variant: ExperimentVariant;
  readonly step: FunnelStep;
  readonly position: number;
}

export function ConfigurationStepMap({
  configuration,
  variant,
  step,
  position,
}: ConfigurationStepMapProperties): UIElement {
  const { t } = useLocalization();
  const sequence = configuration.experiment.variants[variant].stepSequence;
  const previous = sequence[position - 2];
  const next = sequence[position];
  const selection = step.type === 'single-select' || step.type === 'multi-select';

  const limits = selection ? StepRules.selectionLimits(step) : null;
  const minimum = limits?.minimum ?? 0;
  const maximum = step.type === 'single-select' ? 1 : (limits?.maximum ?? 0);

  return (
    <div className="step-map">
      {selection && (
        <section className="step-choice-summary" aria-label={t('Selection limits')}>
          <h4>
            <ListChecks className="size-4" aria-hidden="true" />
            {t('Selection limits')}
          </h4>
          <p className="step-choice-number">
            {minimum}
            <span>–</span>
            {maximum}
            <small>
              {t('of')} {step.input.options.length} {t('options')}
            </small>
          </p>
          <div className="step-choice-scale" aria-hidden="true">
            <span
              style={{
                width: `${(100 * minimum) / step.input.options.length}%`,
              }}
            />
            <span
              style={{
                width: `${(100 * (maximum - minimum)) / step.input.options.length}%`,
              }}
            />
          </div>
          <p className="step-choice-legend">
            <span>
              {t('Minimum')} {minimum}
            </span>
            <span>
              {t('Maximum')} {maximum}
            </span>
          </p>
          <p className="step-map-help">
            {t('The range shows how many answers are accepted, not which options are selected.')}
          </p>
        </section>
      )}
      <section className="step-sequence-summary" aria-label={t('Configured step sequence')}>
        <h4>
          <GitBranch className="size-4" aria-hidden="true" />
          {t('In the flow')}{' '}
          <span>
            {position} / {sequence.length}
          </span>
        </h4>
        <ol>
          <li>
            <span>{t('Previous')}</span>
            <strong>{previous ?? t('Start of flow')}</strong>
          </li>
          <li aria-current="step">
            <ArrowDown className="size-3" aria-hidden="true" />
            <span>{t('Current')}</span>
            <strong>{step.id}</strong>
          </li>
          <li>
            <ArrowDown className="size-3" aria-hidden="true" />
            <span>{t('Next')}</span>
            <strong>{next ?? t('End of flow')}</strong>
          </li>
        </ol>
        <p className="step-map-help">
          {t('Variant')} {variant} {t('configuration order. Visibility rules can skip steps.')}
        </p>
      </section>
    </div>
  );
}
