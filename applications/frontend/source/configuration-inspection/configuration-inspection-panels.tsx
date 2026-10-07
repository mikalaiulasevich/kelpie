import { useLocalization } from '../localization/use-localization';
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
import { ConfigurationVariantStep } from './configuration-variant-step';
import { ConfigurationStepDetails } from './configuration-step-details';
import { isUndefined } from 'es-toolkit/predicate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Badge } from '../components/badge';
import {
  Activity,
  Braces,
  ShieldCheck,
  Fingerprint,
  Check,
  Minus,
  FlaskConical,
  Server,
  LockKeyhole,
  Link2,
  Target,
  MousePointer2,
  ListChecks,
} from 'lucide-react';
import { ConfigurationOverrideDetails } from './configuration-override-details';
import { ConfigurationJson } from './configuration-json';
import { ConfigurationInspectionFormat } from './configuration-inspection-format';

interface ConfigurationPanelProperties {
  readonly configuration: FunnelConfiguration;
}

interface VariantPanelProperties extends ConfigurationPanelProperties {
  readonly variant: Variant;
}

export function ConfigurationStepsPanel({ configuration, variant }: VariantPanelProperties) {
  const { t } = useLocalization();
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
          {t('Inspect step')}
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
          aria-label={t('Configuration steps')}
          className="inspection-step-navigation hidden min-w-0 rounded-4xl border bg-card py-5 lg:block"
        >
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-sm font-semibold">{t('Steps')}</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {variantConfiguration.stepSequence.length} {t('· Variant')} {variant}
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
                  {listedStep?.visibleWhen && <Badge variant="outline">{t('If')}</Badge>}
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
  const { t } = useLocalization();
  const totalWeight =
    configuration.experiment.variants.A.weight + configuration.experiment.variants.B.weight;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="experiment-summary compact-card min-w-0">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="experiment-summary-icon">
              <FlaskConical className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle>{t('Experiment')}</CardTitle>
              <CardDescription className="mt-1 break-all">
                {configuration.experiment.id}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <section
            aria-label={t('Configured traffic allocation')}
            className="experiment-allocation"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium">{t('Traffic allocation')}</h3>
              <span className="text-xs text-muted-foreground">
                {t('Configured weights · actual traffic may vary')}
              </span>
            </div>
            <div className="experiment-allocation-bar" aria-hidden="true">
              {[ExperimentVariant.A, ExperimentVariant.B].map((variant) => (
                <span
                  key={variant}
                  data-variant={variant}
                  style={{ flexGrow: configuration.experiment.variants[variant].weight }}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {[ExperimentVariant.A, ExperimentVariant.B].map((variant) => (
                <div key={variant} className="flex items-center gap-2 text-sm">
                  <span
                    className="experiment-allocation-dot"
                    data-variant={variant}
                    aria-hidden="true"
                  />
                  <span>
                    {t('Variant')} {variant}
                  </span>
                  <strong className="font-medium tabular-nums">
                    {totalWeight > 0
                      ? (
                          (configuration.experiment.variants[variant].weight / totalWeight) *
                          100
                        ).toFixed(0)
                      : '0'}
                    %
                  </strong>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {configuration.experiment.variants[variant].stepSequence.length} {t('steps')}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <dl className="experiment-settings">
            <div>
              <dt>
                <Server aria-hidden="true" />
                {t('Assignment')}
              </dt>
              <dd className="capitalize">{configuration.experiment.assignment}</dd>
              <dd className="experiment-setting-help">
                {t('The server assigns a variant when a session starts.')}
              </dd>
            </div>
            <div>
              <dt>
                <LockKeyhole aria-hidden="true" />
                {t('Sticky variant')}
              </dt>
              <dd>{configuration.experiment.sticky ? t('Enabled') : t('Disabled')}</dd>
              <dd className="experiment-setting-help">
                {t('The assigned variant stays with the session.')}
              </dd>
            </div>
            <div>
              <dt>
                <Link2 aria-hidden="true" />
                {t('Override query parameter')}
              </dt>
              <dd className="break-all">{configuration.experiment.overrideQueryParam}</dd>
              <dd className="experiment-setting-help">
                {t('Request A or B explicitly with this query parameter.')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {[ExperimentVariant.A, ExperimentVariant.B].map((variant) => {
          const variantConfiguration = configuration.experiment.variants[variant];
          const trafficShare =
            totalWeight > 0 ? (variantConfiguration.weight / totalWeight) * 100 : 0;
          const otherVariant =
            variant === ExperimentVariant.A ? ExperimentVariant.B : ExperimentVariant.A;
          const otherSequence = configuration.experiment.variants[otherVariant].stepSequence;

          return (
            <Card
              key={variant}
              className="variant-comparison-card compact-card min-w-0"
              data-variant={variant}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <span className="variant-letter">{variant}</span>
                    {t('Variant')} {variant}
                  </CardTitle>
                  <span className="variant-share">
                    {trafficShare.toFixed(0)}% <span>{t('traffic')}</span>
                  </span>
                </div>
                <CardDescription>
                  {variantConfiguration.stepSequence.length} {t('steps · Weight')}{' '}
                  {variantConfiguration.weight}
                </CardDescription>
                <div className="variant-allocation-track" aria-hidden="true">
                  <div style={{ width: `${trafficShare}%` }} />
                </div>
              </CardHeader>
              <CardContent className="flex min-w-0 flex-col gap-5">
                <div>
                  <h3 className="mb-2 text-sm font-medium">{t('Step order')}</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    {t('Position changes are shown relative to variant')} {otherVariant}.
                  </p>
                  <ol className="variant-step-list">
                    {variantConfiguration.stepSequence.map((identifier, index) => {
                      const otherPosition = otherSequence.indexOf(identifier);
                      const step = DictionaryAccess.readOwn(configuration.steps, identifier);

                      return (
                        <ConfigurationVariantStep
                          key={identifier}
                          identifier={identifier}
                          step={step}
                          position={index + 1}
                          otherPosition={otherPosition < 0 ? undefined : otherPosition + 1}
                          variant={variant}
                          otherVariant={otherVariant}
                        />
                      );
                    })}
                  </ol>
                </div>
                <div className="variant-overrides">
                  <ConfigurationOverrideDetails
                    kind="steps"
                    changes={variantConfiguration.stepOverrides}
                  />
                  <ConfigurationOverrideDetails
                    kind="results"
                    changes={variantConfiguration.resultOverrides}
                  />
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
  const { t } = useLocalization();
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{t('Result selection')}</CardTitle>
          <CardDescription>
            {t(
              'Rules are evaluated in order. The first matching rule selects the result; otherwise the default applies.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          {configuration.resultRules.map((rule, index) => (
            <div key={index} className="min-w-0">
              <div className="result-rule-heading">
                <span className="result-rule-order">
                  <span className="sr-only">{t('Rule')}</span>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="result-rule-label">{t('Show result')}</span>
                <code className="result-rule-target">{rule.resultId}</code>
              </div>
              <ConfigurationJson value={rule.when} />
            </div>
          ))}
          <div className="result-rule-heading result-rule-fallback">
            <span className="result-rule-label">{t('Otherwise show')}</span>
            <code className="result-rule-target">{configuration.defaultResultId}</code>
          </div>
        </CardContent>
      </Card>
      <section className="result-catalog" aria-label={t('Configured results')}>
        <div className="result-catalog-heading">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Target className="size-4 text-primary" aria-hidden="true" />
            {t('Result content')}{' '}
            <span className="text-muted-foreground">
              {Object.keys(configuration.results).length}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('Preview for variant')} {variant} {t('· Includes content overrides')}
          </p>
        </div>
        <div className="result-catalog-grid">
          {Object.values(configuration.results).map((originalResult) => {
            const result = ConfigurationInspectionFormat.result(
              configuration,
              variant,
              originalResult,
            );

            return (
              <Card key={result.id} className="result-content-card compact-card min-w-0">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span className="result-content-icon">
                      <Target className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="result-content-title break-words">
                        {result.title}
                      </CardTitle>
                      <p className="mt-1 break-all text-xs text-muted-foreground">{result.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.id === configuration.defaultResultId && (
                      <span className="result-content-tag">{t('Default result')}</span>
                    )}
                    {Object.hasOwn(
                      configuration.experiment.variants[variant].resultOverrides,
                      result.id,
                    ) && (
                      <span className="result-content-tag">
                        {t('Variant')} {variant} {t('override')}
                      </span>
                    )}
                  </div>
                  <CardDescription className="result-content-summary break-words">
                    {result.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-w-0 flex-1 flex-col gap-3">
                  <h4 className="flex items-center gap-2 text-xs font-medium">
                    <ListChecks className="size-4 text-primary" aria-hidden="true" />
                    {t('Recommendations')}{' '}
                    <span className="text-muted-foreground">{result.recommendations.length}</span>
                  </h4>
                  <ol className="result-recommendations">
                    {result.recommendations.map((recommendation, index) => (
                      <li key={index}>
                        <span className="result-recommendation-number" aria-hidden="true">
                          {index + 1}
                        </span>
                        <span className="break-words">{recommendation}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="result-primary-action">
                    <MousePointer2
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t('Primary action · Preview')}
                      </p>
                      <p className="mt-1 break-words text-sm font-medium">{result.cta.label}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {t('Action:')} {result.cta.action}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ConfigurationEventsPanel({ configuration }: ConfigurationPanelProperties) {
  const { t } = useLocalization();
  return (
    <div className="inspection-events grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <Card className="compact-card min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            {t('Analytics privacy')}
          </CardTitle>
          <CardDescription>
            {t('What this configuration allows in analytics events.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="event-privacy-list">
            <div>
              <dt>{t('Raw answers')}</dt>
              <dd>
                {configuration.events.privacy.storeRawAnswers ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Minus aria-hidden="true" />
                )}
                {configuration.events.privacy.storeRawAnswers ? t('Stored') : t('Not stored')}
              </dd>
            </div>
            <div>
              <dt>{t('Answer types')}</dt>
              <dd>
                {configuration.events.privacy.allowAnswerKinds ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Minus aria-hidden="true" />
                )}
                {configuration.events.privacy.allowAnswerKinds ? t('Allowed') : t('Excluded')}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t('Session answer storage is configured separately in Settings.')}
          </p>
          <details className="event-privacy-json">
            <summary>{t('View declaration')}</summary>
            <ConfigurationJson value={configuration.events.privacy} />
          </details>
        </CardContent>
      </Card>
      <Card className="compact-card min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Braces className="size-4 text-primary" />
            {t('Shared properties')}{' '}
            <span className="event-count">{configuration.events.baseProperties.length}</span>
          </CardTitle>
          <CardDescription>{t('Declared for every event below.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="event-property-grid">
            {configuration.events.baseProperties.map((property) => (
              <li key={property}>
                <Fingerprint aria-hidden="true" />
                <code>{property}</code>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="compact-card min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            {t('Event catalog')}
            <span className="event-count">{configuration.events.allowed.length}</span>
          </CardTitle>
          <CardDescription>
            {t(
              'Configured triggers and additional properties. These describe events, not live activity.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <ul className="event-catalog">
            {configuration.events.allowed.map((event) => (
              <li key={event.name}>
                <span className="event-catalog-icon">
                  <Activity aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3>
                    <code>{event.name}</code>
                  </h3>
                  <p>{event.trigger}</p>
                </div>
                <div className="event-catalog-properties">
                  <span className="event-property-caption">{t('Additional properties')}</span>
                  {event.properties.length > 0 ? (
                    <ul>
                      {event.properties.map((property) => (
                        <li key={property}>
                          <code>{property}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t('Shared properties only')}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
