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
  const { t } = useLocalization();
  const presentation = match(step?.type)
    .with('info', () => ({ icon: Info, label: t('Information') }))
    .with('single-select', () => ({ icon: CircleDot, label: t('Single choice') }))
    .with('multi-select', () => ({ icon: ListChecks, label: t('Multiple choice') }))
    .with('number', () => ({ icon: Hash, label: t('Number input') }))
    .with('result', () => ({ icon: Flag, label: t('Result') }))
    .with(undefined, () => ({ icon: Info, label: t('Step') }))
    .exhaustive();
  const StepIcon = presentation.icon;
  const displacement = isUndefined(otherPosition) ? 0 : position - otherPosition;
  const change = match(otherPosition)
    .with(undefined, () => ({
      icon: Plus,
      label: `Only in ${variant}`,
      detail: `Not in variant ${otherVariant}`,
    }))
    .when(
      () => displacement === 0,
      () => ({ icon: Check, label: t('Same position'), detail: `Both variants · #${position}` }),
    )
    .otherwise(() => ({
      icon: displacement < 0 ? ArrowUp : ArrowDown,
      label: `${Math.abs(displacement)} ${Math.abs(displacement) === 1 ? 'place' : 'places'} ${displacement < 0 ? 'earlier' : 'later'}`,
      detail: `${otherVariant} #${otherPosition} → ${variant} #${position}`,
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
