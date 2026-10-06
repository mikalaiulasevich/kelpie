import { ConfigurationLimits } from '../configuration-policy.js';
import type { ConfigurationIssue, FunnelConfiguration } from '../configuration-types.js';
import type { InteractiveStep, SelectionStep } from '../../steps/step-types.js';

/** One validation owns its indexes and ordered, bounded diagnostics. */
export class ConfigurationValidationContext {
  readonly issues: ConfigurationIssue[] = [];
  readonly answerSteps = new Map<string, InteractiveStep>();
  private readonly selectionIndexes = new Map<SelectionStep, ReadonlySet<TextOrNumber>>();

  constructor(readonly configuration: FunnelConfiguration) {}

  selectionValues(step: SelectionStep): ReadonlySet<TextOrNumber> {
    const existingValues = this.selectionIndexes.get(step);

    if (existingValues !== undefined) {
      return existingValues;
    }

    const values = new Set<TextOrNumber>(step.input.options.map((option) => option.value));
    this.selectionIndexes.set(step, values);

    return values;
  }

  report(path: string, message: string): void {
    if (this.issues.length < ConfigurationLimits.maximumIssues) {
      this.issues.push({ path, message });
    }
  }
}
