import { ConfigurationInspectionContent } from './configuration-inspection-content';
import { useLocalization } from '../localization/use-localization';
import { DictionaryAccess, ExperimentVariant, type FunnelConfiguration } from '@kelpie/contracts';
import { ConfigurationVariantStep } from './configuration-variant-step';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { FlaskConical, Server, LockKeyhole, Link2 } from 'lucide-react';
import { ConfigurationOverrideDetails } from './configuration-override-details';

interface ConfigurationVariantsPanelProperties {
  readonly configuration: FunnelConfiguration;
}
export function ConfigurationVariantsPanel({
  configuration,
}: ConfigurationVariantsPanelProperties) {
  const { t: translate } = useLocalization();
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
              <CardTitle>{translate(ConfigurationInspectionContent.Experiment)}</CardTitle>
              <CardDescription className="mt-1 break-all">
                {configuration.experiment.id}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <section
            aria-label={translate(ConfigurationInspectionContent.ConfiguredTrafficAllocation)}
            className="experiment-allocation"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium">
                {translate(ConfigurationInspectionContent.TrafficAllocation)}
              </h3>
              <span className="text-xs text-muted-foreground">
                {translate(ConfigurationInspectionContent.TrafficAllocationDescription)}
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
                    {translate(ConfigurationInspectionContent.Variant)} {variant}
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
                    {configuration.experiment.variants[variant].stepSequence.length}{' '}
                    {translate(ConfigurationInspectionContent.StepCountSuffix)}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <dl className="experiment-settings">
            <div>
              <dt>
                <Server aria-hidden="true" />
                {translate(ConfigurationInspectionContent.Assignment)}
              </dt>
              <dd className="capitalize">{configuration.experiment.assignment}</dd>
              <dd className="experiment-setting-help">
                {translate(ConfigurationInspectionContent.AssignmentDescription)}
              </dd>
            </div>
            <div>
              <dt>
                <LockKeyhole aria-hidden="true" />
                {translate(ConfigurationInspectionContent.StickyVariant)}
              </dt>
              <dd>
                {configuration.experiment.sticky
                  ? translate(ConfigurationInspectionContent.Enabled)
                  : translate(ConfigurationInspectionContent.Disabled)}
              </dd>
              <dd className="experiment-setting-help">
                {translate(ConfigurationInspectionContent.StickyVariantDescription)}
              </dd>
            </div>
            <div>
              <dt>
                <Link2 aria-hidden="true" />
                {translate(ConfigurationInspectionContent.OverrideQueryParameter)}
              </dt>
              <dd className="break-all">{configuration.experiment.overrideQueryParam}</dd>
              <dd className="experiment-setting-help">
                {translate(ConfigurationInspectionContent.OverrideParameterDescription)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {[ExperimentVariant.A, ExperimentVariant.B].map((variant) => (
          <ConfigurationVariantCard
            key={variant}
            configuration={configuration}
            variant={variant}
            totalWeight={totalWeight}
          />
        ))}
      </div>
    </div>
  );
}

interface ConfigurationVariantCardProperties {
  readonly configuration: FunnelConfiguration;
  readonly variant: ExperimentVariant;
  readonly totalWeight: number;
}

function ConfigurationVariantCard({
  configuration,
  variant,
  totalWeight,
}: ConfigurationVariantCardProperties): UIElement {
  const { t: translate } = useLocalization();

  const variantConfiguration = configuration.experiment.variants[variant];
  const trafficShare = totalWeight > 0 ? (variantConfiguration.weight / totalWeight) * 100 : 0;
  const otherVariant = variant === ExperimentVariant.A ? ExperimentVariant.B : ExperimentVariant.A;
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
            {translate(ConfigurationInspectionContent.Variant)} {variant}
          </CardTitle>
          <span className="variant-share">
            {trafficShare.toFixed(0)}%{' '}
            <span>{translate(ConfigurationInspectionContent.Traffic)}</span>
          </span>
        </div>
        <CardDescription>
          {variantConfiguration.stepSequence.length}{' '}
          {translate(ConfigurationInspectionContent.StepsWeight)} {variantConfiguration.weight}
        </CardDescription>
        <div className="variant-allocation-track" aria-hidden="true">
          <div style={{ width: `${trafficShare}%` }} />
        </div>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        <div>
          <h3 className="mb-2 text-sm font-medium">
            {translate(ConfigurationInspectionContent.StepOrder)}
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {translate(ConfigurationInspectionContent.PositionComparisonDescription)} {otherVariant}
            .
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
          <ConfigurationOverrideDetails kind="steps" changes={variantConfiguration.stepOverrides} />
          <ConfigurationOverrideDetails
            kind="results"
            changes={variantConfiguration.resultOverrides}
          />
        </div>
      </CardContent>
    </Card>
  );
}
