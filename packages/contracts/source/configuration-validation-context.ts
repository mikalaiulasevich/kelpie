import { configurationLimits } from './configuration-policy.js';
import type { ConfigurationIssue, FunnelConfiguration } from './configuration-types.js';
import type { InteractiveStep } from './step-types.js';

/** One validation owns its indexes and ordered, bounded diagnostics. */
export class ConfigurationValidationContext {
  readonly issues: ConfigurationIssue[] = [];
  readonly answerSteps = new Map<string, InteractiveStep>();

  constructor(readonly configuration: FunnelConfiguration) {}

  report(path: string, message: string): void {
    if (this.issues.length < configurationLimits.maximumIssues) {
      this.issues.push({ path, message });
    }
  }
}
