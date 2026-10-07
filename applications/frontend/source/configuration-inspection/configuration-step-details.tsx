import {
  StepType,
  StepRules,
  type FunnelConfiguration,
  type FunnelStep,
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
  const content = ConfigurationInspectionFormat.stepContent(configuration, variant, step);

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
                Step {position} of {configuration.experiment.variants[variant].stepSequence.length}
              </Badge>
              <span className="inspection-type text-xs font-medium">
                {ConfigurationInspectionFormat.contentLabel(step.type.replaceAll(/[_-]/g, ' '))}
              </span>
              {Object.hasOwn(configuration.experiment.variants[variant].stepOverrides, step.id) && (
                <Badge variant="info">Content override</Badge>
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
                      {ConfigurationInspectionFormat.contentLabel(field)}
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
                (selectionStep) => (
                  <section className="flex min-w-0 flex-col gap-2">
                    <div className="inspection-section-label flex items-baseline gap-2">
                      <h4 className="text-sm font-semibold">Answer options</h4>
                      <span className="inspection-option-count">
                        {selectionStep.input.options.length}
                      </span>
                    </div>
                    <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
                      {selectionStep.type === StepType.SingleSelect
                        ? 'Participants can choose one answer.'
                        : `Participants can choose ${StepRules.selectionLimits(selectionStep).minimum}–${StepRules.selectionLimits(selectionStep).maximum} answers.`}{' '}
                      Read-only preview of the configured options.
                    </p>
                    <ul className="inspection-options">
                      {selectionStep.input.options.map((option) => (
                        <li key={option.value} className="inspection-option">
                          <span className="inspection-option-symbol">
                            {selectionStep.type === StepType.SingleSelect ? (
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
                            <span className="inspection-value-label">Value</span>{' '}
                            <code>{option.value}</code>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ),
              )
              .with(
                { type: P.union(StepType.Number, StepType.Information, StepType.Result) },
                () => null,
              )
              .exhaustive()}
          </CardContent>
        </div>
        <aside className="inspection-behavior" aria-label="Step rules and sequence">
          <div className="inspection-behavior-content flex min-w-0 flex-col gap-3">
            <ConfigurationStepMap
              configuration={configuration}
              variant={variant}
              step={step}
              position={position}
            />
            <h4 className="inspection-section-label flex items-center gap-2 text-xs font-medium">
              <SlidersHorizontal aria-hidden="true" className="size-3.5" /> Behavior
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
                    {step.validation.required ? 'Required' : 'Optional'}
                  </Badge>
                  {step.type === StepType.SingleSelect && (
                    <Badge variant="outline" className="inspection-rule">
                      Choose one
                    </Badge>
                  )}
                  {step.type === StepType.MultiSelect && (
                    <Badge variant="outline" className="inspection-rule">
                      Selections: {StepRules.selectionLimits(step).minimum} –{' '}
                      {StepRules.selectionLimits(step).maximum}
                    </Badge>
                  )}
                </div>
                {step.type === StepType.Number && (
                  <div className="flex flex-col gap-2">
                    <h5 className="flex items-center gap-2 text-sm font-medium">
                      <Hash aria-hidden="true" className="size-4 text-muted-foreground" />
                      Number input
                    </h5>
                    <p className="whitespace-pre-wrap break-words text-sm tabular-nums">
                      {step.input.min} – {step.input.max} {step.input.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">Increment: {step.input.step}</p>
                  </div>
                )}
                <div className="inspection-answer-contract">
                  <Code2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Answer field:{' '}
                      <code className="inspection-field break-all">{step.input.name}</code>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {step.validation.required
                        ? 'An answer is required before continuing.'
                        : 'Participants can continue without an answer.'}{' '}
                      Values are checked by the server.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {step.type === StepType.Result && (
              <p className="text-xs text-muted-foreground">
                Result source:{' '}
                <code className="inspection-field break-all">{step.resultSource}</code>
              </p>
            )}
            <div className="min-w-0">
              {isUndefined(step.visibleWhen) ? (
                <p className="inspection-visibility flex items-center gap-2 text-sm">
                  <Eye aria-hidden="true" className="size-4 text-muted-foreground" />
                  Always visible
                </p>
              ) : (
                <details className="group min-w-0">
                  <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 rounded-md py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    <Eye aria-hidden="true" className="size-4 text-muted-foreground" />
                    Visibility rules
                    <Badge variant="info">Conditional</Badge>
                    <ChevronDown
                      aria-hidden="true"
                      className="ml-auto size-4 group-open:rotate-180"
                    />
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
                    Advanced input & validation
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
      </div>
    </Card>
  );
}
