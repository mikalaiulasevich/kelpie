import { ConfigurationInspectionContent } from './configuration-inspection-content';
import { useLocalization } from '../localization/use-localization';
import type { ExperimentVariant, FunnelStep } from '@kelpie/contracts';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleDot,
  Flag,
  Hash,
  Info,
  ListChecks,
  Plus,
} from 'lucide-react';
import { isUndefined } from 'es-toolkit/predicate';
import { match } from 'ts-pattern';
import { ConfigurationInspectionFormat } from './configuration-inspection-format';

interface ConfigurationVariantStepProperties {
  readonly identifier: string;
  readonly step: Optional<FunnelStep>;
  readonly position: number;
  readonly otherPosition: Optional<number>;
  readonly variant: ExperimentVariant;
  readonly otherVariant: ExperimentVariant;
}

export function ConfigurationVariantStep({
  identifier,
  step,
  position,
  otherPosition,
  variant,
  otherVariant,
}: ConfigurationVariantStepProperties): UIElement {
  const { t: translate } = useLocalization();
  const presentation = match(step?.type)
    .with('info', () => ({
      icon: Info,
      label: translate(ConfigurationInspectionContent.Information),
    }))
    .with('single-select', () => ({
      icon: CircleDot,
      label: translate(ConfigurationInspectionContent.SingleChoice),
    }))
    .with('multi-select', () => ({
      icon: ListChecks,
      label: translate(ConfigurationInspectionContent.MultipleChoice),
    }))
    .with('number', () => ({
      icon: Hash,
      label: translate(ConfigurationInspectionContent.NumberInput),
    }))
    .with('result', () => ({ icon: Flag, label: translate(ConfigurationInspectionContent.Result) }))
    .with(undefined, () => ({ icon: Info, label: translate(ConfigurationInspectionContent.Step) }))
    .exhaustive();
  const StepIcon = presentation.icon;
  const displacement = isUndefined(otherPosition) ? 0 : position - otherPosition;
  const change = match(otherPosition)
    .with(undefined, () => ({
      icon: Plus,
      label: translate(ConfigurationInspectionContent.OnlyInVariant, { variant }),
      detail: translate(ConfigurationInspectionContent.AbsentFromVariant, {
        variant: otherVariant,
      }),
    }))
    .when(
      () => displacement === 0,
      () => ({
        icon: Check,
        label: translate(ConfigurationInspectionContent.SamePosition),
        detail: translate(ConfigurationInspectionContent.BothVariantsPosition, { position }),
      }),
    )
    .otherwise(() => ({
      icon: displacement < 0 ? ArrowUp : ArrowDown,
      label:
        Math.abs(displacement) === 1
          ? translate(
              displacement < 0
                ? ConfigurationInspectionContent.OnePlaceEarlier
                : ConfigurationInspectionContent.OnePlaceLater,
            )
          : translate(
              displacement < 0
                ? ConfigurationInspectionContent.PlacesEarlier
                : ConfigurationInspectionContent.PlacesLater,
              {
                count: Math.abs(displacement),
              },
            ),
      detail: ConfigurationInspectionContent.positionChange(
        otherVariant,
        otherPosition,
        variant,
        position,
      ),
    }));
  const ChangeIcon = change.icon;

  return (
    <li data-moved={otherPosition !== position}>
      <span className="variant-step-position">{position}</span>
      <span className="variant-step-icon" title={presentation.label}>
        <StepIcon className="size-4" aria-hidden="true" />
      </span>
      <span className="variant-step-name">
        <span className="block font-medium">
          {ConfigurationInspectionFormat.contentLabel(identifier.replaceAll(/[_-]/g, ' '))}
        </span>
        <span className="block text-xs text-muted-foreground">
          {presentation.label} · <span title={identifier}>{identifier}</span>
        </span>
      </span>
      <span className="variant-position-change">
        <span className="inline-flex items-center gap-1">
          <ChangeIcon className="size-3.5" aria-hidden="true" />
          {change.label}
        </span>
        <span className="block text-xs text-muted-foreground">{change.detail}</span>
      </span>
    </li>
  );
}
