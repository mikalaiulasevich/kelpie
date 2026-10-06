import { ConditionValidation } from './condition-validation.js';
import { ConfigurationMessages } from './configuration-messages.js';
import { ConfigurationSchemaPolicy } from './configuration-policy.js';
import type { ConfigurationValidationContext } from './configuration-validation-context.js';
import type { VariantConfiguration } from './configuration-types.js';
import { readOwnProperty } from './dictionary.js';
import { StepType } from './domain-values.js';
import { StepContentValidation } from './step-content-validation.js';
import type { FunnelStep } from './step-types.js';

/** Answer availability and result counts belong to one variant traversal. */
class VariantSequenceValidation {
  private readonly earlierAnswers = new Set<string>();
  private resultCount = 0;
  private readonly path: string;

  constructor(
    private readonly context: ConfigurationValidationContext,
    variantIdentifier: string,
    private readonly variant: VariantConfiguration,
  ) {
    this.path = `/experiment/variants/${variantIdentifier}`;
  }

  validate(): void {
    for (const [position, stepIdentifier] of this.variant.stepSequence.entries()) {
      this.validateStep(stepIdentifier, position);
    }

    if (this.resultCount !== ConfigurationSchemaPolicy.requiredResultSteps) {
      this.context.report(`${this.path}/stepSequence`, ConfigurationMessages.SingleResultRequired);
    }

    this.validateOverrideTargets();
  }

  private validateStep(stepIdentifier: string, position: number): void {
    const step = readOwnProperty(this.context.configuration.steps, stepIdentifier);

    if (step === undefined) {
      this.context.report(
        `${this.path}/stepSequence`,
        ConfigurationMessages.UnknownStep(stepIdentifier),
      );

      return;
    }

    this.validateContent(stepIdentifier, step);
    this.validateVisibility(stepIdentifier, step);
    this.trackStep(step, position);
  }

  private validateContent(stepIdentifier: string, step: FunnelStep): void {
    const override = readOwnProperty(this.variant.stepOverrides, stepIdentifier);

    if (override === undefined) {
      return;
    }

    const issue = StepContentValidation.validate(
      step.type,
      { ...step.content, ...override.content },
      `${this.path}/stepOverrides/${stepIdentifier}/content`,
    );

    if (issue !== undefined) {
      this.context.report(issue.path, issue.message);
    }
  }

  private validateVisibility(stepIdentifier: string, step: FunnelStep): void {
    if (step.visibleWhen === undefined) {
      return;
    }

    ConditionValidation.validate(
      this.context,
      step.visibleWhen,
      `/steps/${stepIdentifier}/visibleWhen`,
      this.earlierAnswers,
    );
  }

  private trackStep(step: FunnelStep, position: number): void {
    if (step.type === StepType.Result) {
      this.resultCount += 1;

      if (position !== this.variant.stepSequence.length - 1) {
        this.context.report(
          `${this.path}/stepSequence`,
          ConfigurationMessages.FinalResultPositionRequired,
        );
      }

      return;
    }

    if (step.type !== StepType.Information) {
      this.earlierAnswers.add(step.input.name);
    }
  }

  private validateOverrideTargets(): void {
    const sequenceIdentifiers = new Set(this.variant.stepSequence);

    for (const stepIdentifier of Object.keys(this.variant.stepOverrides)) {
      if (!sequenceIdentifiers.has(stepIdentifier)) {
        this.context.report(
          `${this.path}/stepOverrides/${stepIdentifier}`,
          ConfigurationMessages.OverrideOutsideVariant,
        );
      }
    }

    for (const resultIdentifier of Object.keys(this.variant.resultOverrides)) {
      if (!Object.hasOwn(this.context.configuration.results, resultIdentifier)) {
        this.context.report(
          `${this.path}/resultOverrides/${resultIdentifier}`,
          ConfigurationMessages.UnknownResultOverride,
        );
      }
    }
  }
}

export const VariantValidation = {
  validate(context: ConfigurationValidationContext): void {
    const variants = context.configuration.experiment.variants;

    for (const [identifier, variant] of Object.entries(variants)) {
      new VariantSequenceValidation(context, identifier, variant).validate();
    }

    if (variants.A.weight + variants.B.weight !== ConfigurationSchemaPolicy.totalExperimentWeight) {
      context.report('/experiment/variants', ConfigurationMessages.InvalidVariantWeightTotal);
    }
  },
} as const;
