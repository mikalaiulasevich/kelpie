import { ConfigurationValidationContext } from './configuration-validation-context.js';
import type { ConfigurationIssue, FunnelConfiguration } from './configuration-types.js';
import { StepValidation } from './step-validation.js';
import { VariantValidation } from './variant-validation.js';
import { ResultValidation } from './result-validation.js';
import { EventValidation } from './event-validation.js';

export const ConfigurationSemantics = {
  validate(configuration: FunnelConfiguration): ReadonlyList<ConfigurationIssue> {
    const context = new ConfigurationValidationContext(configuration);
    StepValidation.validate(context);
    VariantValidation.validate(context);
    ResultValidation.validate(context);
    EventValidation.validate(context);

    return context.issues;
  },
} as const;
