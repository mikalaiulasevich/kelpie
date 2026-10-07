import {
  StepType,
  StepRules,
  type FunnelConfiguration,
  type FunnelStep,
  type ExperimentVariant,
} from '@kelpie/contracts';
import { isUndefined } from 'es-toolkit/predicate';
import { ChevronDown, CircleDot, Eye, Hash, ListChecks, SlidersHorizontal } from 'lucide-react';
import { match, P } from 'ts-pattern';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
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
      <CardHeader className="gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="inspection-position">
            Step {position}
          </Badge>
          <span className="inspection-type text-xs font-medium">
            {ConfigurationInspectionFormat.contentLabel(step.type.replaceAll(/[_-]/g, ' '))}
          </span>
          {Object.hasOwn(configuration.experiment.variants[variant].stepOverrides, step.id) && (
            <Badge variant="info">Content override</Badge>
          )}
        </div>
        <CardDescription className="inspection-identifier break-all font-mono text-xs">
          {step.id}
        </CardDescription>
        {!isUndefined(content.eyebrow) && (
          <p className="max-w-prose whitespace-pre-wrap break-words text-sm font-medium text-info">
            {content.eyebrow}
          </p>
        )}
        <CardTitle className="inspection-question">
          <h3 className="max-w-[36ch] whitespace-pre-wrap break-words text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {content.title ?? content.loadingTitle ?? step.id}
          </h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-6 px-5 pb-6 pt-4 sm:px-7">
        <dl className="flex max-w-prose flex-col gap-4">
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
                      ? 'whitespace-pre-wrap break-words text-base leading-7'
                      : 'whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground'
                  }
                >
                  {value}
                </dd>
              </div>
            ))}
        </dl>
        {match(step)
          .with({ type: P.union(StepType.SingleSelect, StepType.MultiSelect) }, (selectionStep) => (
            <section className="flex min-w-0 flex-col gap-2">
              <div className="inspection-section-label flex items-baseline gap-2">
                <h4 className="text-sm font-semibold">Answer options</h4>
                <span className="text-xs text-muted-foreground">
                  {selectionStep.input.options.length}
                </span>
              </div>
              <ul className="inspection-options">
                {selectionStep.input.options.map((option) => (
                  <li key={option.value} className="inspection-option">
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
                    <span className="whitespace-pre-wrap break-words leading-5">
                      {option.label}
                    </span>
                    <code className="inspection-option-value">{option.value}</code>
                  </li>
                ))}
              </ul>
            </section>
          ))
          .with(
            { type: P.union(StepType.Number, StepType.Information, StepType.Result) },
            () => null,
          )
          .exhaustive()}
      </CardContent>
      <div className="inspection-behavior flex min-w-0 flex-col gap-4 px-5 py-5 sm:px-7">
        <h4 className="inspection-section-label flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <SlidersHorizontal aria-hidden="true" className="size-3.5" /> Behavior
        </h4>
        {'input' in step && (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="inspection-rule">
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
                  <Hash aria-hidden="true" className="size-4 text-info" />
                  Number input
                </h5>
                <p className="whitespace-pre-wrap break-words text-sm tabular-nums">
                  {step.input.min} – {step.input.max} {step.input.unit}
                </p>
                <p className="text-xs text-muted-foreground">Increment: {step.input.step}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Answer field: <code className="inspection-field break-all">{step.input.name}</code>
            </p>
          </div>
        )}
        {step.type === StepType.Result && (
          <p className="text-xs text-muted-foreground">
            Result source: <code className="inspection-field break-all">{step.resultSource}</code>
          </p>
        )}
        <div className="min-w-0">
          {isUndefined(step.visibleWhen) ? (
            <p className="inspection-visibility flex items-center gap-2 text-sm">
              <Eye aria-hidden="true" className="size-4 text-success" />
              Always visible
            </p>
          ) : (
            <details className="group min-w-0">
              <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 rounded-md py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <Eye aria-hidden="true" className="size-4 text-info" />
                Visibility rules
                <Badge variant="info">Conditional</Badge>
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
    </Card>
  );
}
