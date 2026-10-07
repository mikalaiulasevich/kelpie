import {
  StepType,
  StepRules,
  type FunnelConfiguration,
  type FunnelStep,
  type ExperimentVariant,
} from '@kelpie/contracts';
import { isUndefined } from 'es-toolkit/predicate';
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
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">
            Step {position} ·{' '}
            {ConfigurationInspectionFormat.contentLabel(step.type.replaceAll('_', ' '))}
          </span>
          {Object.hasOwn(configuration.experiment.variants[variant].stepOverrides, step.id) && (
            <Badge>Content override</Badge>
          )}
        </div>
        <CardTitle className="break-words">
          {content.title ?? content.loadingTitle ?? step.id}
        </CardTitle>
        <CardDescription className="break-all">{step.id}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3">
          {Object.entries(content)
            .filter(([field]) => field !== 'title' && field !== 'loadingTitle')
            .map(([field, value]) => (
              <div key={field}>
                <p className="text-xs text-muted-foreground">
                  {ConfigurationInspectionFormat.contentLabel(field)}
                </p>
                <p className="break-words text-sm">{value}</p>
              </div>
            ))}
        </div>
        {match(step)
          .with({ type: StepType.Number }, (numberStep) => (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Number input</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {numberStep.input.min} – {numberStep.input.max} {numberStep.input.unit}
                </Badge>
                <Badge variant="outline">Increment: {numberStep.input.step}</Badge>
                <Badge variant="secondary">
                  {numberStep.validation.required ? 'Required' : 'Optional'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Answer field: {numberStep.input.name}</p>
            </div>
          ))
          .with({ type: P.union(StepType.SingleSelect, StepType.MultiSelect) }, (selectionStep) => (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Answer options</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {selectionStep.validation.required ? 'Required' : 'Optional'}
                </Badge>
                {selectionStep.type === StepType.SingleSelect ? (
                  <Badge variant="outline">Choose one</Badge>
                ) : (
                  <Badge variant="outline">
                    Selections: {StepRules.selectionLimits(selectionStep).minimum} –{' '}
                    {StepRules.selectionLimits(selectionStep).maximum}
                  </Badge>
                )}
              </div>
              <ul className="flex flex-col gap-2">
                {selectionStep.input.options.map((option) => (
                  <li
                    key={option.value}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b py-2.5 text-sm last:border-b-0"
                  >
                    <span className="break-words">{option.label}</span>
                    <code className="break-all text-xs text-muted-foreground">{option.value}</code>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Answer field: {selectionStep.input.name}
              </p>
            </div>
          ))
          .with({ type: P.union(StepType.Information, StepType.Result) }, () => null)
          .exhaustive()}
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-medium">Visibility</h3>
          {isUndefined(step.visibleWhen) ? (
            <p className="text-sm text-muted-foreground">Always visible</p>
          ) : (
            <ConfigurationJson value={step.visibleWhen} />
          )}
        </div>
        {'input' in step && (
          <Collapsible className="min-w-0">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                Advanced input & validation
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 min-w-0">
              <ConfigurationJson value={{ input: step.input, validation: step.validation }} />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
