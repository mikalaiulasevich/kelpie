import { ConfigurationInspectionContent } from './configuration-inspection-content';
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
  const { t: translate } = useLocalization();
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
        <section
          className="step-choice-summary"
          aria-label={translate(ConfigurationInspectionContent.SelectionLimits)}
        >
          <h4>
            <ListChecks className="size-4" aria-hidden="true" />
            {translate(ConfigurationInspectionContent.SelectionLimits)}
          </h4>
          <p className="step-choice-number">
            {minimum}
            <span>–</span>
            {maximum}
            <small>
              {translate(ConfigurationInspectionContent.Of)} {step.input.options.length}{' '}
              {translate(ConfigurationInspectionContent.Options)}
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
              {translate(ConfigurationInspectionContent.Minimum)} {minimum}
            </span>
            <span>
              {translate(ConfigurationInspectionContent.Maximum)} {maximum}
            </span>
          </p>
          <p className="step-map-help">
            {translate(ConfigurationInspectionContent.SelectionLimitsDescription)}
          </p>
        </section>
      )}
      <section
        className="step-sequence-summary"
        aria-label={translate(ConfigurationInspectionContent.ConfiguredStepSequence)}
      >
        <h4>
          <GitBranch className="size-4" aria-hidden="true" />
          {translate(ConfigurationInspectionContent.InTheFlow)}{' '}
          <span>
            {position} / {sequence.length}
          </span>
        </h4>
        <ol>
          <li>
            <span>{translate(ConfigurationInspectionContent.Previous)}</span>
            <strong>{previous ?? translate(ConfigurationInspectionContent.StartOfFlow)}</strong>
          </li>
          <li aria-current="step">
            <ArrowDown className="size-3" aria-hidden="true" />
            <span>{translate(ConfigurationInspectionContent.Current)}</span>
            <strong>{step.id}</strong>
          </li>
          <li>
            <ArrowDown className="size-3" aria-hidden="true" />
            <span>{translate(ConfigurationInspectionContent.Next)}</span>
            <strong>{next ?? translate(ConfigurationInspectionContent.EndOfFlow)}</strong>
          </li>
        </ol>
        <p className="step-map-help">
          {translate(ConfigurationInspectionContent.Variant)} {variant}{' '}
          {translate(ConfigurationInspectionContent.SequenceVisibilityDescription)}
        </p>
      </section>
    </div>
  );
}
