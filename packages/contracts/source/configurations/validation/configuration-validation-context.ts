import { memoize } from 'es-toolkit/function';
import { ConfigurationLimits } from '../configuration-policy.js';
import type { ConfigurationIssue, FunnelConfiguration } from '../configuration-types.js';
import type { InteractiveStep, SelectionStep } from '../../steps/step-types.js';

/** One validation owns its indexes and ordered, bounded diagnostics. */
export class ConfigurationValidationContext {
  readonly issues: ConfigurationIssue[] = [];

  readonly answerSteps = new Map<string, InteractiveStep>();

  readonly selectionValues: ValueMapper<SelectionStep, ReadonlySet<TextOrNumber>> = memoize(
    (step: SelectionStep): ReadonlySet<TextOrNumber> =>
      new Set(step.input.options.map((option) => option.value)),
  );

  constructor(readonly configuration: FunnelConfiguration) {}

  report(path: string, message: string): void {
    if (this.issues.length < ConfigurationLimits.maximumIssues) {
      this.issues.push({ path, message });
    }
  }
}
