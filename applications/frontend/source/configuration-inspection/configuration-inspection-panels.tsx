import {
  DictionaryAccess,
  ExperimentVariant,
  type FunnelConfiguration,
  type ExperimentVariant as Variant,
} from '@kelpie/contracts';
import { useState } from 'react';
import { Button } from '../components/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/select';
import { ConfigurationStepDetails } from './configuration-step-details';
import { isUndefined } from 'es-toolkit/predicate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Badge } from '../components/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/table';
import { ConfigurationJson } from './configuration-json';
import { ConfigurationInspectionFormat } from './configuration-inspection-format';

interface ConfigurationPanelProperties {
  readonly configuration: FunnelConfiguration;
}

interface VariantPanelProperties extends ConfigurationPanelProperties {
  readonly variant: Variant;
}

export function ConfigurationStepsPanel({ configuration, variant }: VariantPanelProperties) {
  const variantConfiguration = configuration.experiment.variants[variant];
  const [selectedIdentifier, setSelectedIdentifier] = useState<Optional<string>>(undefined);
  const identifier =
    variantConfiguration.stepSequence.find((candidate) => candidate === selectedIdentifier) ??
    variantConfiguration.stepSequence[0];
  const step = isUndefined(identifier)
    ? undefined
    : DictionaryAccess.readOwn(configuration.steps, identifier);

  if (isUndefined(step)) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="min-w-0 lg:hidden">
        <label htmlFor="inspection-step" className="mb-2 block text-sm font-medium">
          Inspect step
        </label>
        <Select value={step.id} onValueChange={setSelectedIdentifier}>
          <SelectTrigger id="inspection-step" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {variantConfiguration.stepSequence.map((stepIdentifier, index) => (
                <SelectItem key={stepIdentifier} value={stepIdentifier}>
                  {index + 1}. {stepIdentifier}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
        <nav
          aria-label="Configuration steps"
          className="inspection-step-navigation hidden min-w-0 rounded-4xl border bg-card py-5 lg:block"
        >
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-sm font-semibold">Steps</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {variantConfiguration.stepSequence.length} · Variant {variant}
            </span>
          </div>
          <div className="flex flex-col gap-1 px-2">
            {variantConfiguration.stepSequence.map((stepIdentifier, index) => {
              const listedStep = DictionaryAccess.readOwn(configuration.steps, stepIdentifier);

              return (
                <Button
                  key={stepIdentifier}
                  data-step-type={listedStep?.type}
                  variant={step.id === stepIdentifier ? 'secondary' : 'ghost'}
                  className="inspection-step-link h-auto min-h-11 w-full justify-start gap-3 whitespace-normal px-3 py-2.5"
                  aria-pressed={step.id === stepIdentifier}
                  onClick={() => setSelectedIdentifier(stepIdentifier)}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <span
                    className="min-w-0 flex-1 break-words text-left text-[13px]"
                    title={stepIdentifier}
                  >
                    {stepIdentifier}
                    <span className="inspection-step-kind">
                      {listedStep?.type.replaceAll('-', ' ')}
                    </span>
                  </span>
                  {listedStep?.visibleWhen && <Badge variant="outline">If</Badge>}
                </Button>
              );
            })}
          </div>
        </nav>
        <ConfigurationStepDetails
          key={step.id}
          configuration={configuration}
          variant={variant}
          step={step}
          position={variantConfiguration.stepSequence.indexOf(step.id) + 1}
        />
      </div>
    </div>
  );
}

export function ConfigurationVariantsPanel({ configuration }: ConfigurationPanelProperties) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Experiment</CardTitle>
          <CardDescription className="break-all">{configuration.experiment.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Assignment</dt>
              <dd>{configuration.experiment.assignment}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sticky variant</dt>
              <dd>{configuration.experiment.sticky ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Override query parameter</dt>
              <dd className="break-all">{configuration.experiment.overrideQueryParam}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {[ExperimentVariant.A, ExperimentVariant.B].map((variant) => {
          const variantConfiguration = configuration.experiment.variants[variant];

          return (
            <Card key={variant} className="min-w-0">
              <CardHeader>
                <CardTitle>Variant {variant}</CardTitle>
                <CardDescription>
                  Assignment weight: {variantConfiguration.weight} ·{' '}
                  {variantConfiguration.stepSequence.length} steps
                </CardDescription>
              </CardHeader>
              <CardContent className="flex min-w-0 flex-col gap-5">
                <div>
                  <h3 className="mb-2 text-sm font-medium">Step order</h3>
                  <ol className="flex flex-col gap-1 pl-5 text-sm list-decimal">
                    {variantConfiguration.stepSequence.map((identifier) => (
                      <li key={identifier} className="break-all">
                        {identifier}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="min-w-0">
                  <h3 className="mb-2 text-sm font-medium">Step content changes</h3>
                  <ConfigurationJson value={variantConfiguration.stepOverrides} />
                </div>
                <div className="min-w-0">
                  <h3 className="mb-2 text-sm font-medium">Result changes</h3>
                  <ConfigurationJson value={variantConfiguration.resultOverrides} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function ConfigurationResultsPanel({ configuration, variant }: VariantPanelProperties) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Result selection</CardTitle>
          <CardDescription>
            Rules are evaluated in order. The first matching rule selects the result; otherwise the
            default applies.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          {configuration.resultRules.map((rule, index) => (
            <div key={index} className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">Rule {index + 1}</Badge>
                <span className="break-all text-sm">{rule.resultId}</span>
              </div>
              <ConfigurationJson value={rule.when} />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default result</Badge>
            <span className="break-all text-sm">{configuration.defaultResultId}</span>
          </div>
        </CardContent>
      </Card>
      {Object.values(configuration.results).map((originalResult) => {
        const result = ConfigurationInspectionFormat.result(configuration, variant, originalResult);

        return (
          <Card key={result.id} className="min-w-0">
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="max-w-full whitespace-normal break-all">
                  {result.id}
                </Badge>
                {Object.hasOwn(
                  configuration.experiment.variants[variant].resultOverrides,
                  result.id,
                ) && <Badge>Content override</Badge>}
              </div>
              <CardTitle className="break-words">{result.title}</CardTitle>
              <CardDescription className="break-words">{result.summary}</CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-4">
              <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
                {result.recommendations.map((recommendation, index) => (
                  <li key={index} className="break-words">
                    {recommendation}
                  </li>
                ))}
              </ul>
              <div>
                <p className="text-xs text-muted-foreground">Primary action</p>
                <p className="break-words text-sm">{result.cta.label}</p>
                <p className="break-all text-xs text-muted-foreground">{result.cta.action}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ConfigurationEventsPanel({ configuration }: ConfigurationPanelProperties) {
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Analytics stores answer kinds, not raw participant answers. Raw answer persistence
            belongs to session settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigurationJson value={configuration.events.privacy} />
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Base event properties</CardTitle>
          <CardDescription>Common declarations shared by all allowed events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {configuration.events.baseProperties.map((property) => (
              <Badge
                key={property}
                variant="outline"
                className="max-w-full whitespace-normal break-all"
              >
                {property}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle>Allowed events</CardTitle>
          <CardDescription>
            {configuration.events.allowed.length} event declarations. Trigger descriptions are
            configuration text.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Additional properties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configuration.events.allowed.map((event) => (
                <TableRow key={event.name}>
                  <TableCell className="align-top">
                    <code>{event.name}</code>
                  </TableCell>
                  <TableCell className="min-w-64 whitespace-normal align-top">
                    {event.trigger}
                  </TableCell>
                  <TableCell className="min-w-48 whitespace-normal align-top">
                    {event.properties.length > 0 ? event.properties.join(', ') : 'None'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
