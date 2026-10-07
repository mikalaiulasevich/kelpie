import { ConfigurationInspectionContent } from './configuration-inspection-content';
import { useLocalization } from '../localization/use-localization';
import {
  DictionaryAccess,
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
import { Badge } from '../components/badge';
import { ConfigurationInspectionFormat } from './configuration-inspection-format';

interface ConfigurationStepsPanelProperties {
  readonly configuration: FunnelConfiguration;
  readonly variant: Variant;
}
export function ConfigurationStepsPanel({
  configuration,
  variant,
}: ConfigurationStepsPanelProperties) {
  const { t: translate } = useLocalization();
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
          {translate(ConfigurationInspectionContent.InspectStep)}
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
          aria-label={translate(ConfigurationInspectionContent.ConfigurationSteps)}
          className="inspection-step-navigation hidden min-w-0 rounded-4xl border bg-card py-5 lg:block"
        >
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-sm font-semibold">
              {translate(ConfigurationInspectionContent.Steps)}
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {variantConfiguration.stepSequence.length}{' '}
              {translate(ConfigurationInspectionContent.VariantSeparator)} {variant}
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
                      {listedStep &&
                        translate(
                          ConfigurationInspectionFormat.contentLabel(
                            listedStep.type.replaceAll('-', ' '),
                          ),
                        )}
                    </span>
                  </span>
                  {listedStep?.visibleWhen && (
                    <Badge variant="outline">{translate(ConfigurationInspectionContent.If)}</Badge>
                  )}
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
