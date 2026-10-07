import { ConfigurationInspectionProjection } from './configuration-inspection-projection';
import { ConfigurationInspectionContent } from './configuration-inspection-content';
import { useLocalization } from '../localization/use-localization';
import {
  StepType,
  StepRules,
  type FunnelConfiguration,
  type FunnelStep,
  type SelectionStep,
  type ExperimentVariant,
} from '@kelpie/contracts';
import { isUndefined } from 'es-toolkit/predicate';
import {
  ChevronDown,
  CircleDot,
  Eye,
  Hash,
  ListChecks,
  SlidersHorizontal,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { match, P } from 'ts-pattern';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { ConfigurationStepMap } from './configuration-step-map';
import { ConfigurationJson } from './configuration-json';
import { ConfigurationInspectionFormat } from './configuration-inspection-format';

interface ConfigurationStepDetailsProperties {
  readonly configuration: FunnelConfiguration;
  readonly variant: ExperimentVariant;
  readonly step: FunnelStep;
  readonly position: number;
}

export function ConfigurationStepDetails({
  configuration,
  variant,
  step,
  position,
}: ConfigurationStepDetailsProperties) {
  const { t: translate } = useLocalization();
  const content = ConfigurationInspectionProjection.stepContent(configuration, variant, step);

  return (
    <Card
      data-step-type={step.type}
      className="inspection-detail min-w-0 gap-0 overflow-hidden py-0"
    >
      <div className="inspection-workbench">
        <div className="inspection-workbench-main">
          <CardHeader className="inspection-preview-header">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="inspection-position">
                {translate(ConfigurationInspectionContent.Step)} {position}{' '}
                {translate(ConfigurationInspectionContent.Of)}{' '}
                {configuration.experiment.variants[variant].stepSequence.length}
              </Badge>
              <span className="inspection-type text-xs font-medium">
                {translate(
                  ConfigurationInspectionFormat.contentLabel(step.type.replaceAll(/[_-]/g, ' ')),
                )}
              </span>
              {Object.hasOwn(configuration.experiment.variants[variant].stepOverrides, step.id) && (
                <Badge variant="info">
                  {translate(ConfigurationInspectionContent.ContentOverride)}
                </Badge>
              )}
            </div>
            <CardDescription className="inspection-identifier break-all text-xs">
              {step.id}
            </CardDescription>
            {!isUndefined(content.eyebrow) && (
              <p className="max-w-prose whitespace-pre-wrap break-words text-xs font-medium text-muted-foreground">
                {content.eyebrow}
              </p>
            )}
            <CardTitle className="inspection-question">
              <h3 className="max-w-[40ch] whitespace-pre-wrap break-words text-xl font-medium leading-snug tracking-tight">
                {content.title ?? content.loadingTitle ?? step.id}
              </h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="inspection-preview-content flex min-w-0 flex-col gap-5">
            <dl className="flex w-full max-w-prose flex-col gap-3">
              {Object.entries(content)
                .filter(
                  ([field]) =>
                    field !== 'title' &&
                    field !== 'eyebrow' &&
                    (field !== 'loadingTitle' || !isUndefined(content.title)),
                )
                .map(([field, value]) => (
                  <div key={field} className="min-w-0">
                    <dt
                      className={
                        field === 'body' || field === 'helperText'
                          ? 'sr-only'
                          : 'mb-1 text-xs font-medium text-muted-foreground'
                      }
                    >
                      {translate(ConfigurationInspectionFormat.contentLabel(field))}
                    </dt>
                    <dd
                      className={
                        field === 'body'
                          ? 'whitespace-pre-wrap break-words text-sm leading-6'
                          : 'whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground'
                      }
                    >
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
            {match(step)
              .with(
                { type: P.union(StepType.SingleSelect, StepType.MultiSelect) },
                (selectionStep) => <ConfigurationStepOptions step={selectionStep} />,
              )
              .with(
                { type: P.union(StepType.Number, StepType.Information, StepType.Result) },
                () => null,
              )
              .exhaustive()}
          </CardContent>
        </div>
        <ConfigurationStepBehavior
          configuration={configuration}
          variant={variant}
          step={step}
          position={position}
        />
      </div>
    </Card>
  );
}

function ConfigurationStepOptions({ step }: { readonly step: SelectionStep }): UIElement {
  const { t: translate } = useLocalization();

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="inspection-section-label flex items-baseline gap-2">
        <h4 className="text-sm font-semibold">
          {translate(ConfigurationInspectionContent.AnswerOptions)}
        </h4>
        <span className="inspection-option-count">{step.input.options.length}</span>
      </div>
      <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
        {step.type === StepType.SingleSelect
          ? translate(ConfigurationInspectionContent.SingleChoiceDescription)
          : translate(ConfigurationInspectionContent.SelectionRangeDescription, {
              ...StepRules.selectionLimits(step),
            })}{' '}
        {translate(ConfigurationInspectionContent.OptionsPreviewDescription)}
      </p>
      <ul className="inspection-options">
        {step.input.options.map((option) => (
          <li key={option.value} className="inspection-option">
            <span className="inspection-option-symbol">
              {step.type === StepType.SingleSelect ? (
                <CircleDot
                  aria-hidden="true"
                  className="inspection-option-icon size-5"
                  strokeWidth={1.5}
                />
              ) : (
                <ListChecks
                  aria-hidden="true"
                  className="inspection-option-icon size-5"
                  strokeWidth={1.5}
                />
              )}
            </span>
            <span className="inspection-option-label whitespace-pre-wrap break-words leading-5">
              {option.label}
            </span>
            <span className="inspection-option-value">
              <span className="inspection-value-label">
                {translate(ConfigurationInspectionContent.Value)}
              </span>{' '}
              <code>{option.value}</code>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConfigurationStepBehavior({
  configuration,
  variant,
  step,
  position,
}: ConfigurationStepDetailsProperties): UIElement {
  const { t: translate } = useLocalization();

  return (
    <aside
      className="inspection-behavior"
      aria-label={translate(ConfigurationInspectionContent.StepRulesAndSequence)}
    >
      <div className="inspection-behavior-content flex min-w-0 flex-col gap-3">
        <ConfigurationStepMap
          configuration={configuration}
          variant={variant}
          step={step}
          position={position}
        />
        <h4 className="inspection-section-label flex items-center gap-2 text-xs font-medium">
          <SlidersHorizontal aria-hidden="true" className="size-3.5" />{' '}
          {translate(ConfigurationInspectionContent.Behavior)}
        </h4>
        {'input' in step && (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="inspection-rule"
                data-required={step.validation.required}
              >
                <ShieldCheck className="size-3" aria-hidden="true" />
                {step.validation.required
                  ? translate(ConfigurationInspectionContent.Required)
                  : translate(ConfigurationInspectionContent.Optional)}
              </Badge>
              {step.type === StepType.SingleSelect && (
                <Badge variant="outline" className="inspection-rule">
                  {translate(ConfigurationInspectionContent.ChooseOne)}
                </Badge>
              )}
              {step.type === StepType.MultiSelect && (
                <Badge variant="outline" className="inspection-rule">
                  {translate(ConfigurationInspectionContent.Selections)}{' '}
                  {StepRules.selectionLimits(step).minimum} –{' '}
                  {StepRules.selectionLimits(step).maximum}
                </Badge>
              )}
            </div>
            {step.type === StepType.Number && (
              <div className="flex flex-col gap-2">
                <h5 className="flex items-center gap-2 text-sm font-medium">
                  <Hash aria-hidden="true" className="size-4 text-muted-foreground" />
                  {translate(ConfigurationInspectionContent.NumberInput)}
                </h5>
                <p className="whitespace-pre-wrap break-words text-sm tabular-nums">
                  {step.input.min} – {step.input.max} {step.input.unit}
                </p>
                <p className="text-xs text-muted-foreground">
                  {translate(ConfigurationInspectionContent.Increment)} {step.input.step}
                </p>
              </div>
            )}
            <div className="inspection-answer-contract">
              <Code2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {translate(ConfigurationInspectionContent.AnswerField)}{' '}
                  <code className="inspection-field break-all">{step.input.name}</code>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {step.validation.required
                    ? translate(ConfigurationInspectionContent.RequiredAnswerDescription)
                    : translate(ConfigurationInspectionContent.OptionalAnswerDescription)}{' '}
                  {translate(ConfigurationInspectionContent.ServerValidationDescription)}
                </p>
              </div>
            </div>
          </div>
        )}
        {step.type === StepType.Result && (
          <p className="text-xs text-muted-foreground">
            {translate(ConfigurationInspectionContent.ResultSource)}{' '}
            <code className="inspection-field break-all">{step.resultSource}</code>
          </p>
        )}
        <div className="min-w-0">
          {isUndefined(step.visibleWhen) ? (
            <p className="inspection-visibility flex items-center gap-2 text-sm">
              <Eye aria-hidden="true" className="size-4 text-muted-foreground" />
              {translate(ConfigurationInspectionContent.AlwaysVisible)}
            </p>
          ) : (
            <details className="group min-w-0">
              <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 rounded-md py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <Eye aria-hidden="true" className="size-4 text-muted-foreground" />
                {translate(ConfigurationInspectionContent.VisibilityRules)}
                <Badge variant="info">
                  {translate(ConfigurationInspectionContent.Conditional)}
                </Badge>
                <ChevronDown aria-hidden="true" className="ml-auto size-4 group-open:rotate-180" />
              </summary>
              <div className="min-w-0 pt-2">
                <ConfigurationJson value={step.visibleWhen} />
              </div>
            </details>
          )}
        </div>
        {'input' in step && (
          <Collapsible className="min-w-0">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto w-full justify-start whitespace-normal text-left [&[data-state=open]>svg:last-child]:rotate-180"
              >
                <SlidersHorizontal aria-hidden="true" />
                {translate(ConfigurationInspectionContent.AdvancedInputValidation)}
                <ChevronDown aria-hidden="true" className="ml-auto" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 min-w-0">
              <ConfigurationJson value={{ input: step.input, validation: step.validation }} />
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </aside>
  );
}
